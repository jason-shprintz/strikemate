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
