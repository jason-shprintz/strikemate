/**
 * In-memory TTL cache with max-size cap and in-flight promise coalescing.
 *
 * League data on LeagueSecretary is only updated once a week after scores
 * are entered, so repeated fetches are wasteful. This cache holds responses
 * in memory with per-entry TTLs and is keyed by a caller-supplied string.
 *
 * TTL guidelines:
 *   - Standings / bowler list: 1 hour  (changes weekly, not mid-session)
 *   - Weekly scores / matchups: 10 minutes  (secretary may still be entering)
 *
 * Design notes:
 *   - Max size cap: when the store reaches MAX_SIZE, the oldest inserted entry
 *     is evicted (insertion-order LRU via Map iteration).
 *   - Stampede prevention: in-flight promises are coalesced per key so concurrent
 *     requests only trigger one upstream fetch.
 *   - Future: swap the Map for a Redis client without changing call sites.
 */

/** Maximum number of entries before oldest is evicted. */
const MAX_SIZE = 500;

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Date.now() ms
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

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
    // Evict the oldest entry if we're at capacity
    if (this.store.size >= MAX_SIZE && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Coalesces concurrent fetches for the same key.
   * If a fetch for `key` is already in flight, returns the same promise
   * rather than launching a second upstream request.
   */
  async getOrFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = fetcher().then((value) => {
      this.set(key, value, ttlMs);
      this.inflight.delete(key);
      return value;
    }).catch((err) => {
      this.inflight.delete(key);
      throw err;
    });

    this.inflight.set(key, promise);
    return promise;
  }

  /** Manually evict a key — useful if we know data has changed. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Evict all expired entries. Called periodically to reclaim memory. */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  /** Current number of cached entries. */
  get size(): number {
    return this.store.size;
  }
}

/** Singleton cache instance shared across all routes. */
export const cache = new Cache();

/** TTLs in milliseconds. */
export const TTL = {
  /** Standings and bowler list — changes at most once a week. */
  STANDINGS: 60 * 60 * 1000,
  /** Weekly scores and derived matchups — secretary may still be entering. */
  SCORES: 10 * 60 * 1000,
} as const;

// Purge expired entries every 5 minutes to reclaim memory.
setInterval(() => cache.purgeExpired(), 5 * 60 * 1000).unref();

/**
 * Builds a consistent cache key.
 * Format: `{endpoint}:{leagueId}:{year}:{season}:{weekNum}`
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
