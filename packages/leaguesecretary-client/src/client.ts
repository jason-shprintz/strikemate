import type { LSApiResponse, LSBowler, LSLeagueRef, LSTeamStanding, LSWeekScore } from "./ls-types.js";

const BASE_URL = "https://www.leaguesecretary.com";

/**
 * Posts form-encoded data to a Kendo UI Read endpoint and returns Data[].
 * All LS data endpoints follow this pattern.
 */
async function postLS<T>(path: string, body: Record<string, string | number>): Promise<T[]> {
  const form = new URLSearchParams();
  // Kendo UI grid always sends these pagination/sort params
  form.set("sort", "");
  form.set("page", "1");
  form.set("pageSize", "1000");
  form.set("group", "");
  form.set("filter", "");
  // Endpoint-specific params
  for (const [key, value] of Object.entries(body)) {
    form.set(key, String(value));
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    throw new Error(
      `LeagueSecretary API error: ${res.status} ${res.statusText} - ${path}`
    );
  }

  const json = (await res.json()) as LSApiResponse<T>;
  if (json.Errors !== null) {
    throw new Error(`LeagueSecretary API returned errors for ${path}`);
  }
  return json.Data;
}

// Confirmed endpoints (from DevTools network tab):
//   POST /League/InteractiveStandings_Read
//   POST /Bowler/BowlerByWeekList_Read
//   POST /League/Summary_Read

export async function fetchStandings(ref: LSLeagueRef): Promise<LSTeamStanding[]> {
  return postLS<LSTeamStanding>("/League/InteractiveStandings_Read", {
    leagueId: ref.leagueId,
    year: ref.year,
    season: ref.season,
    weekNum: ref.weekNum,
  });
}

export async function fetchBowlerList(ref: LSLeagueRef): Promise<LSBowler[]> {
  return postLS<LSBowler>("/Bowler/BowlerByWeekList_Read", {
    leagueId: ref.leagueId,
    year: ref.year,
    season: ref.season,
    weekNum: ref.weekNum,
  });
}

export async function fetchWeekScores(
  ref: LSLeagueRef,
  weekNumber: number
): Promise<LSWeekScore[]> {
  return postLS<LSWeekScore>("/League/Summary_Read", {
    leagueId: ref.leagueId,
    year: ref.year,
    season: ref.season,
    weekNum: weekNumber,
  });
}
