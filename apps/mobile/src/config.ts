/** API base URL — set EXPO_PUBLIC_API_BASE in .env.local to override */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ?? "http://192.168.1.4:3001";

/**
 * League query string (leagueId, year, season, weekNum).
 * Set EXPO_PUBLIC_LEAGUE_QUERY in .env.local to override.
 */
export const LEAGUE_QUERY =
  process.env.EXPO_PUBLIC_LEAGUE_QUERY ??
  "leagueId=131919&year=2025&season=f&weekNum=26";

/**
 * The current/default week number parsed from LEAGUE_QUERY.
 * Used as the initial week in the weekly recap screen.
 */
export const DEFAULT_WEEK = (() => {
  const match = LEAGUE_QUERY.match(/(?:^|&)weekNum=(\d+)/);
  return match ? Number(match[1]) : 1;
})();
