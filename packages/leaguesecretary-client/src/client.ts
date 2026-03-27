import type { LSApiResponse, LSBowler, LSLeagueRef, LSTeamStanding, LSWeekScore } from "./ls-types.js";

const BASE_URL = "https://www.leaguesecretary.com";

/**
 * Builds the base path for a league:
 *   /bowling-centers/{centerSlug}/bowling-leagues/{leagueSlug}
 */
function leaguePath(ref: LSLeagueRef): string {
  return `/bowling-centers/${ref.centerSlug}/bowling-leagues/${ref.leagueSlug}`;
}

async function fetchLS<T>(url: string): Promise<T[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `LeagueSecretary API error: ${res.status} ${res.statusText} - ${url}`
    );
  }
  const json = (await res.json()) as LSApiResponse<T>;
  if (json.Errors !== null) {
    throw new Error(`LeagueSecretary API returned errors for ${url}`);
  }
  return json.Data;
}

export async function fetchStandings(ref: LSLeagueRef): Promise<LSTeamStanding[]> {
  const url = `${BASE_URL}${leaguePath(ref)}/league/standings/${ref.leagueId}`;
  return fetchLS<LSTeamStanding>(url);
}

export async function fetchBowlerList(ref: LSLeagueRef): Promise<LSBowler[]> {
  const url = `${BASE_URL}${leaguePath(ref)}/bowler/list/${ref.leagueId}`;
  return fetchLS<LSBowler>(url);
}

// weekNumber is 1-based.
export async function fetchWeekScores(
  ref: LSLeagueRef,
  weekNumber: number
): Promise<LSWeekScore[]> {
  const url = `${BASE_URL}${leaguePath(ref)}/league/summary/${ref.leagueId}?week=${weekNumber}`;
  return fetchLS<LSWeekScore>(url);
}
