/**
 * Simple in-memory TTL cache.
 *
 * League data on LeagueSecretary is only updated once a week after scores
 * are entered, so repeated fetches are wasteful. This cache holds responses
 * in memory with per-entry TTLs and is keyed by a caller-supplied string.
 *
 * TTL guidelines (from issue #9):
 *   - Standings / bowler list: 1 hour  (changes weekly, not mid-session)
 *   - Weekly scores / matchups: 10 minutes  (secretary may still be entering)
 *
 * Future: swap the Map for a Redis client without changing call sites.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Date.now() ms
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Manually evict a key — useful if we know data has changed. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Evict all expired entries. Call periodically to avoid memory growth. */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

/** Singleton cache instance shared across all routes. */
export const cache = new Cache();

/** TTLs in milliseconds. */
export const TTL = {
  /** Standings and bowler list — changes at most once a week. */
  STANDINGS: 60 * 60 * 1000,       // 1 hour
  /** Weekly scores and derived matchups — secretary may still be entering. */
  SCORES: 10 * 60 * 1000,          // 10 minutes
} as const;

// Purge expired entries every 5 minutes to prevent unbounded memory growth.
setInterval(() => cache.purgeExpired(), 5 * 60 * 1000).unref();

/**
 * Builds a cache key from a league ref and an endpoint name.
 * All cache keys follow the format: `{endpoint}:{leagueId}:{year}:{season}:{weekNum}`
 */
export function cacheKey(
  endpoint: string,
  leagueId: number,
  year: number,
  season: string,
  weekNum: number
): string {
  return `${endpoint}:${leagueId}:${year}:${season}:${weekNum}`;
}
