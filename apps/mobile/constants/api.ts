// Base URL for the StrikeMate API.
// In development this points to your local machine.
// On a physical device, replace with your machine's local IP (e.g. http://192.168.1.x:3001)
// so the phone can reach the API over your network.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

// Pilot league — Sunday Fun Winter 25-26 at Sun Coast Hotel & Casino
export const DEFAULT_LEAGUE_REF = {
  leagueId: 131919,
  year: 2025,
  season: "f",
  weekNum: 26,
} as const;

export function leagueQuery(overrides?: Partial<typeof DEFAULT_LEAGUE_REF>): string {
  const ref = { ...DEFAULT_LEAGUE_REF, ...overrides };
  return `leagueId=${ref.leagueId}&year=${ref.year}&season=${ref.season}&weekNum=${ref.weekNum}`;
}
