import type { LSApiResponse, LSBowler, LSTeamStanding, LSWeekScore } from "./ls-types.js";

const BASE_URL = "https://www.leaguesecretary.com/api";

async function fetchLS<T>(path: string): Promise<T[]> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(
      `LeagueSecretary API error: ${res.status} ${res.statusText} — ${path}`
    );
  }
  const json = (await res.json()) as LSApiResponse<T>;
  if (json.Errors !== null) {
    throw new Error(`LeagueSecretary API returned errors for ${path}`);
  }
  return json.Data;
}

export async function fetchStandings(leagueId: number): Promise<LSTeamStanding[]> {
  return fetchLS<LSTeamStanding>(`/league/standings/${leagueId}`);
}

export async function fetchBowlerList(leagueId: number): Promise<LSBowler[]> {
  return fetchLS<LSBowler>(`/league/bowlerlist/${leagueId}`);
}

// weekNumber is 1-based. Verify the exact query string key against the
// live network tab — may be ?week= or ?WeekNum= or similar.
export async function fetchWeekScores(
  leagueId: number,
  weekNumber: number
): Promise<LSWeekScore[]> {
  return fetchLS<LSWeekScore>(`/league/summary/${leagueId}?week=${weekNumber}`);
}
