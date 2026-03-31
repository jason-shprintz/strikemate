import { useCallback, useEffect, useState } from "react";
import { API_BASE, LEAGUE_QUERY } from "../config";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface BowlerScore {
  bowlerId: string;
  name: string;
  games: [number?, number?, number?];
  scratchTotal: number;
  /** Per-game handicap (HandicapBeforeBowling). */
  handicapPerGame: number;
  /** Series handicap total (scratch + full handicap). */
  handicapTotal: number;
  status: "active" | "absent" | "sub" | "vacancy";
}

export interface TeamScore {
  teamId: string;
  teamName: string;
  bowlers: BowlerScore[];
  scratchTotal: number;
  handicapTotal: number;
  /** Points won this matchup (game points + series point). */
  points: number;
}

export interface MatchupRecap {
  id: string;
  lanes: [number, number];
  home: TeamScore;
  away: TeamScore;
}

export type FetchStatus = "loading" | "idle" | "error";

export interface UseWeekScoresResult {
  matchups: MatchupRecap[];
  status: FetchStatus;
  error: string;
  refresh: () => void;
}

// ─── Raw API Response Types ───────────────────────────────────────────────────

interface RawSeries {
  bowlerId: string;
  weekId: string;
  teamId: string;
  status: "active" | "absent" | "sub" | "vacancy";
  games: [number?, number?, number?];
  scratchTotal: number;
  handicap: number;
  handicapTotal: number;
}

interface RawMatchup {
  id: string;
  weekId: string;
  leagueId: string;
  lanes: [number, number];
  homeTeamId: string;
  awayTeamId: string;
  homePoints?: number;
  awayPoints?: number;
}

interface RawBowler {
  id: string;
  teamId: string;
  name: string;
  teamName: string;
  currentAverage: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Standard number of games bowled per series (used for handicap per-game calculation). */
const GAMES_PER_SERIES = 3;

// ─── Point Calculation ────────────────────────────────────────────────────────

/**
 * Computes the handicap total for one game across a team's bowlers.
 * Absent bowlers (identified here by an undefined game score) are excluded
 * entirely from this per-game total; the API represents absent series as 0
 * totals, so they do not indirectly contribute via series handicap either.
 */
function teamGameHandicapTotal(
  bowlers: BowlerScore[],
  gameIdx: 0 | 1 | 2,
): number {
  return bowlers.reduce((sum, b) => {
    const g = b.games[gameIdx];
    return g !== undefined ? sum + g + b.handicapPerGame : sum;
  }, 0);
}

/**
 * Derives the points for both teams in a matchup.
 * Standard league scoring: 1 point per game won (by handicap total) + 1 for
 * series total (by handicap). Maximum 4 points per side.
 * Ties award no points to either team.
 */
function computePoints(
  home: Pick<TeamScore, "bowlers" | "handicapTotal">,
  away: Pick<TeamScore, "bowlers" | "handicapTotal">,
): [number, number] {
  let hp = 0;
  let ap = 0;

  for (const i of [0, 1, 2] as const) {
    const homeGame = teamGameHandicapTotal(home.bowlers, i);
    const awayGame = teamGameHandicapTotal(away.bowlers, i);
    if (homeGame > awayGame) hp++;
    else if (awayGame > homeGame) ap++;
    // tie: no points awarded
  }

  // Series point
  if (home.handicapTotal > away.handicapTotal) hp++;
  else if (away.handicapTotal > home.handicapTotal) ap++;

  return [hp, ap];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWeekScores(weekNumber: number): UseWeekScoresResult {
  const [matchups, setMatchups] = useState<MatchupRecap[]>([]);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Clear stale matchups when the week changes so the full-screen spinner is
  // shown instead of a momentary flash of the previous week's data.
  // A pull-to-refresh (refreshKey increment only) intentionally does not clear
  // so the existing cards remain visible behind the RefreshControl indicator.
  useEffect(() => {
    setMatchups([]);
  }, [weekNumber]);

  useEffect(() => {
    setStatus("loading");
    setError("");

    const controller = new AbortController();
    const { signal } = controller;

    async function fetchJson<T>(url: string): Promise<T> {
      const r = await fetch(url, { signal });
      if (!r.ok) {
        let message = `HTTP ${r.status}`;
        try {
          const body = (await r.json()) as { error?: string };
          if (typeof body.error === "string") message = body.error;
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(message);
      }
      return r.json() as Promise<T>;
    }

    // Override weekNum so all three requests are aligned to the selected week.
    const leagueParams = new URLSearchParams(LEAGUE_QUERY);
    leagueParams.set("weekNum", String(weekNumber));
    const leagueQueryForWeek = leagueParams.toString();

    const bowlersUrl = `${API_BASE}/league/bowlers?${leagueQueryForWeek}`;
    const scoresUrl = `${API_BASE}/league/scores/${weekNumber}?${leagueQueryForWeek}`;
    const matchupsUrl = `${API_BASE}/league/matchups/${weekNumber}?${leagueQueryForWeek}`;

    Promise.all([
      fetchJson<RawBowler[]>(bowlersUrl),
      fetchJson<RawSeries[]>(scoresUrl),
      fetchJson<RawMatchup[]>(matchupsUrl),
    ])
      .then(([bowlers, scores, rawMatchups]) => {
        // Build name/teamName lookup by bowlerId
        const bowlerMap = new Map<string, { name: string }>();
        const teamNameMap = new Map<string, string>();
        for (const b of bowlers) {
          bowlerMap.set(b.id, { name: b.name });
          if (b.teamId !== "0") teamNameMap.set(b.teamId, b.teamName);
        }

        const toBowlerScore = (s: RawSeries): BowlerScore => ({
          bowlerId: s.bowlerId,
          name: bowlerMap.get(s.bowlerId)?.name ?? `Bowler ${s.bowlerId}`,
          games: s.games,
          scratchTotal: s.scratchTotal,
          handicapPerGame: s.handicap > 0 ? Math.round(s.handicap / GAMES_PER_SERIES) : 0,
          handicapTotal: s.handicapTotal,
          status: s.status,
        });

        // Pre-group scores by teamId for O(1) lookups per matchup.
        const scoresByTeamId = new Map<string, RawSeries[]>();
        for (const s of scores) {
          const existing = scoresByTeamId.get(s.teamId);
          if (existing) {
            existing.push(s);
          } else {
            scoresByTeamId.set(s.teamId, [s]);
          }
        }

        const result: MatchupRecap[] = rawMatchups.map((m) => {
          const homeBowlers = (scoresByTeamId.get(m.homeTeamId) ?? []).map(toBowlerScore);
          const awayBowlers = (scoresByTeamId.get(m.awayTeamId) ?? []).map(toBowlerScore);

          const homeBase = {
            teamId: m.homeTeamId,
            teamName: teamNameMap.get(m.homeTeamId) ?? `Team ${m.homeTeamId}`,
            bowlers: homeBowlers,
            scratchTotal: homeBowlers.reduce((s, b) => s + b.scratchTotal, 0),
            handicapTotal: homeBowlers.reduce((s, b) => s + b.handicapTotal, 0),
          };
          const awayBase = {
            teamId: m.awayTeamId,
            teamName: teamNameMap.get(m.awayTeamId) ?? `Team ${m.awayTeamId}`,
            bowlers: awayBowlers,
            scratchTotal: awayBowlers.reduce((s, b) => s + b.scratchTotal, 0),
            handicapTotal: awayBowlers.reduce((s, b) => s + b.handicapTotal, 0),
          };

          const [homePoints, awayPoints] = computePoints(homeBase, awayBase);

          return {
            id: m.id,
            lanes: m.lanes,
            home: { ...homeBase, points: homePoints },
            away: { ...awayBase, points: awayPoints },
          };
        });

        setMatchups(result);
        setStatus("idle");
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("error");
      });

    return () => controller.abort();
  }, [weekNumber, refreshKey]);

  return { matchups, status, error, refresh };
}
