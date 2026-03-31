import {
  fetchBowlerList,
  fetchStandings,
  fetchWeekScores,
  mapBowler,
  mapSeries,
  mapTeamStanding,
  deriveMatchups,
} from "@strikemate/leaguesecretary-client";
import type { LSBowler, LSLeagueRef, LSWeekScore } from "@strikemate/leaguesecretary-client";
import type {
  HeadToHeadRecord,
  LeagueId,
  MatchupPreview,
  Team,
  TeamId,
  WeekId,
} from "@strikemate/types";
import { type Response, Router } from "express";
import { cache, cacheKey, TTL } from "../cache.js";

export const leagueRouter = Router();

/**
 * Parses the league identity params shared by all routes.
 * weekNum is optional — routes that take :weekNumber as a path param
 * use that directly and don't need weekNum in the query string.
 */
function parseLeagueRef(
  query: Record<string, unknown>,
  requireWeekNum = true
): LSLeagueRef | null {
  const { leagueId, year, season, weekNum } = query;
  if (
    typeof leagueId !== "string" ||
    typeof year !== "string" ||
    typeof season !== "string" ||
    isNaN(Number(leagueId)) ||
    isNaN(Number(year))
  ) {
    return null;
  }
  if (requireWeekNum && (typeof weekNum !== "string" || isNaN(Number(weekNum)))) {
    return null;
  }
  return {
    leagueId: Number(leagueId),
    year: Number(year),
    season,
    weekNum: typeof weekNum === "string" ? Number(weekNum) : 0,
  };
}

/**
 * Handles cache lookup, upstream fetch, and X-Cache header in one place.
 * Sets X-Cache: HIT on a cache hit, MISS on a fetch, and BYPASS on errors.
 * This prevents the HIT/MISS logic from drifting across routes.
 */
async function withCache<T>(
  res: Response,
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<void> {
  try {
    const isHit = cache.get(key) !== undefined;
    const data = await cache.getOrFetch(key, ttl, fetcher);
    res.setHeader("X-Cache", isHit ? "HIT" : "MISS");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.setHeader("X-Cache", "BYPASS");
    res.status(502).json({ error: "Failed to fetch data from LeagueSecretary" });
  }
}

// GET /league/standings?leagueId=131919&year=2025&season=f&weekNum=26
leagueRouter.get("/standings", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  if (!ref) {
    res.setHeader("X-Cache", "BYPASS");
    res.status(400).json({ error: "Required query params: leagueId, year, season, weekNum" });
    return;
  }
  const key = cacheKey("standings", ref.leagueId, ref.year, ref.season, ref.weekNum);
  await withCache(res, key, TTL.STANDINGS, async () => {
    const raw = await fetchStandings(ref);
    return raw.map((s) => mapTeamStanding(s, String(ref.leagueId) as LeagueId));
  });
});

// GET /league/bowlers?leagueId=131919&year=2025&season=f&weekNum=26
leagueRouter.get("/bowlers", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  if (!ref) {
    res.setHeader("X-Cache", "BYPASS");
    res.status(400).json({ error: "Required query params: leagueId, year, season, weekNum" });
    return;
  }
  const key = cacheKey("bowlers", ref.leagueId, ref.year, ref.season, ref.weekNum);
  await withCache(res, key, TTL.STANDINGS, async () => {
    const raw = await fetchBowlerList(ref);
    return raw.map((b) => mapBowler(b, String(ref.leagueId) as LeagueId));
  });
});

// GET /league/scores/:weekNumber?leagueId=131919&year=2025&season=f
// weekNum is optional here — :weekNumber in the path is the source of truth
leagueRouter.get("/scores/:weekNumber", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>, false);
  const weekNumber = Number(req.params.weekNumber);
  if (!ref || isNaN(weekNumber)) {
    res.setHeader("X-Cache", "BYPASS");
    res.status(400).json({ error: "Required query params: leagueId, year, season" });
    return;
  }
  const key = cacheKey("scores", ref.leagueId, ref.year, ref.season, weekNumber);
  await withCache(res, key, TTL.SCORES, async () => {
    const raw = await fetchWeekScores({ ...ref, weekNum: weekNumber }, weekNumber);
    const weekId = `${ref.leagueId}-w${weekNumber}` as WeekId;
    return raw.map((s) => mapSeries(s, String(ref.leagueId) as LeagueId, weekId));
  });
});

// GET /league/matchups/:weekNumber?leagueId=131919&year=2025&season=f
// weekNum is optional here — :weekNumber in the path is the source of truth
leagueRouter.get("/matchups/:weekNumber", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>, false);
  const weekNumber = Number(req.params.weekNumber);
  if (!ref || isNaN(weekNumber)) {
    res.setHeader("X-Cache", "BYPASS");
    res.status(400).json({ error: "Required query params: leagueId, year, season" });
    return;
  }
  const key = cacheKey("matchups", ref.leagueId, ref.year, ref.season, weekNumber);
  await withCache(res, key, TTL.SCORES, async () => {
    const raw = await fetchWeekScores({ ...ref, weekNum: weekNumber }, weekNumber);
    const weekId = `${ref.leagueId}-w${weekNumber}` as WeekId;
    return deriveMatchups(raw, String(ref.leagueId) as LeagueId, weekId);
  });
});

// ─── Matchup Preview Helpers ─────────────────────────────────────────────────

/** Number of recent weeks to include in form display. */
const RECENT_FORM_WEEKS = 5;

/** Fetches raw week scores, reusing any entry already in the shared cache. */
async function getCachedWeekScores(ref: LSLeagueRef, weekNum: number): Promise<LSWeekScore[]> {
  const key = cacheKey("scores", ref.leagueId, ref.year, ref.season, weekNum);
  return cache.getOrFetch(key, TTL.SCORES, () => fetchWeekScores(ref, weekNum));
}

/** Fetches raw bowler list, reusing any entry already in the shared cache. */
async function getCachedBowlers(ref: LSLeagueRef, weekNum: number): Promise<LSBowler[]> {
  const key = cacheKey("bowlers", ref.leagueId, ref.year, ref.season, weekNum);
  return cache.getOrFetch(key, TTL.STANDINGS, () => fetchBowlerList({ ...ref, weekNum }));
}

/**
 * Computes how many bowling points (0–4) each team earned in a single matchup.
 * Awards 1 point per game won (by handicap total) and 1 for the series.
 * Ties award no points to either team.
 */
function computeMatchupPoints(
  scores: LSWeekScore[],
  homeTeamId: string,
  awayTeamId: string
): [homePoints: number, awayPoints: number] {
  const homeSeries = scores.filter((s) => String(s.TeamID) === homeTeamId);
  const awaySeries = scores.filter((s) => String(s.TeamID) === awayTeamId);

  function teamGameHandicapTotal(series: LSWeekScore[], gameIdx: 1 | 2 | 3): number {
    return series.reduce((sum, s) => {
      const type = gameIdx === 1 ? s.ScoreType1 : gameIdx === 2 ? s.ScoreType2 : s.ScoreType3;
      const score = gameIdx === 1 ? s.Score1 : gameIdx === 2 ? s.Score2 : s.Score3;
      return type === "S" || type === "I" ? sum + score + s.HandicapBeforeBowling : sum;
    }, 0);
  }

  let hp = 0;
  let ap = 0;
  for (const g of [1, 2, 3] as const) {
    const homeGame = teamGameHandicapTotal(homeSeries, g);
    const awayGame = teamGameHandicapTotal(awaySeries, g);
    if (homeGame > awayGame) hp++;
    else if (awayGame > homeGame) ap++;
  }

  const homeSeriesTotal = homeSeries.reduce((sum, s) => sum + s.HandicapSeriesTotal, 0);
  const awaySeriesTotal = awaySeries.reduce((sum, s) => sum + s.HandicapSeriesTotal, 0);
  if (homeSeriesTotal > awaySeriesTotal) hp++;
  else if (awaySeriesTotal > homeSeriesTotal) ap++;

  return [hp, ap];
}

/**
 * Builds a MatchupPreview for the given team and week by:
 *   1. Deriving the current week's matchup from bowled scores
 *   2. Fetching all prior weeks to compute head-to-head record and recent form
 */
async function buildMatchupPreview(
  ref: LSLeagueRef,
  weekNumber: number,
  teamId: TeamId
): Promise<MatchupPreview> {
  const leagueId = String(ref.leagueId) as LeagueId;
  const weekId = `${ref.leagueId}-w${weekNumber}` as WeekId;

  // Fetch current week data in parallel
  const [currentScores, bowlers] = await Promise.all([
    getCachedWeekScores(ref, weekNumber),
    getCachedBowlers(ref, weekNumber),
  ]);

  // Derive the current week's matchups from bowled scores
  const weekMatchups = deriveMatchups(currentScores, leagueId, weekId);

  const matchup = weekMatchups.find(
    (m) => m.homeTeamId === teamId || m.awayTeamId === teamId
  );
  if (!matchup) {
    throw new Error(`NOT_FOUND:No matchup found for team ${teamId} in week ${weekNumber}`);
  }

  // Build Team objects from bowler roster data
  const findTeamName = (tId: string) =>
    bowlers.find((b) => String(b.TeamID) === tId && b.TeamID !== 0)?.TeamName ??
    `Team ${tId}`;

  const homeTeam: Team = { id: matchup.homeTeamId, leagueId, name: findTeamName(matchup.homeTeamId) };
  const awayTeam: Team = { id: matchup.awayTeamId, leagueId, name: findTeamName(matchup.awayTeamId) };

  // Sort each team's bowlers by roster position for position-by-position comparison
  const toBowlers = (tId: string) =>
    bowlers
      .filter((b) => String(b.TeamID) === tId && b.TeamID !== 0)
      .sort((a, b2) => a.BowlerPosition - b2.BowlerPosition)
      .map((b) => mapBowler(b, leagueId));

  const homeBowlers = toBowlers(matchup.homeTeamId);
  const awayBowlers = toBowlers(matchup.awayTeamId);

  // Fetch all previous weeks in parallel to compute head-to-head and recent form
  const prevWeekScores = await Promise.all(
    Array.from({ length: weekNumber - 1 }, (_, i) => i + 1).map(async (w) => {
      try {
        return { weekNum: w, scores: await getCachedWeekScores(ref, w) };
      } catch {
        return { weekNum: w, scores: [] as LSWeekScore[] };
      }
    })
  );

  const headToHead: HeadToHeadRecord = {
    leagueId,
    teamAId: matchup.homeTeamId,
    teamBId: matchup.awayTeamId,
    teamAWins: 0,
    teamBWins: 0,
    meetings: [],
  };

  const homeWeeklyPoints: number[] = [];
  const awayWeeklyPoints: number[] = [];

  for (const { weekNum: w, scores } of prevWeekScores) {
    if (scores.length === 0) continue;
    const wId = `${ref.leagueId}-w${w}` as WeekId;
    const prevMatchups = deriveMatchups(scores, leagueId, wId);

    // Head-to-head: check if these two specific teams played each other
    const h2hMatch = prevMatchups.find(
      (m) =>
        (m.homeTeamId === matchup.homeTeamId && m.awayTeamId === matchup.awayTeamId) ||
        (m.homeTeamId === matchup.awayTeamId && m.awayTeamId === matchup.homeTeamId)
    );
    if (h2hMatch) {
      const [hp, ap] = computeMatchupPoints(scores, h2hMatch.homeTeamId, h2hMatch.awayTeamId);
      const teamAPoints = h2hMatch.homeTeamId === matchup.homeTeamId ? hp : ap;
      const teamBPoints = h2hMatch.homeTeamId === matchup.homeTeamId ? ap : hp;
      headToHead.meetings.push({ weekId: wId, teamAPoints, teamBPoints });
      if (teamAPoints > teamBPoints) headToHead.teamAWins++;
      else if (teamBPoints > teamAPoints) headToHead.teamBWins++;
    }

    // Recent form: track each team's points regardless of opponent
    const homeMatch = prevMatchups.find(
      (m) => m.homeTeamId === matchup.homeTeamId || m.awayTeamId === matchup.homeTeamId
    );
    if (homeMatch) {
      const [hp, ap] = computeMatchupPoints(scores, homeMatch.homeTeamId, homeMatch.awayTeamId);
      homeWeeklyPoints.push(homeMatch.homeTeamId === matchup.homeTeamId ? hp : ap);
    }

    const awayMatch = prevMatchups.find(
      (m) => m.homeTeamId === matchup.awayTeamId || m.awayTeamId === matchup.awayTeamId
    );
    if (awayMatch) {
      const [hp, ap] = computeMatchupPoints(scores, awayMatch.homeTeamId, awayMatch.awayTeamId);
      awayWeeklyPoints.push(awayMatch.homeTeamId === matchup.awayTeamId ? hp : ap);
    }
  }

  return {
    matchup,
    homeTeam,
    awayTeam,
    homeBowlers,
    awayBowlers,
    headToHead,
    recentForm: {
      homeTeamPoints: homeWeeklyPoints.slice(-RECENT_FORM_WEEKS),
      awayTeamPoints: awayWeeklyPoints.slice(-RECENT_FORM_WEEKS),
    },
  };
}

// GET /league/matchup-preview?leagueId=131919&year=2025&season=f&weekNum=26&teamId=42
leagueRouter.get("/matchup-preview", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>, false);
  const { weekNum: weekNumRaw, teamId } = req.query as Record<string, unknown>;
  const weekNumber = Number(weekNumRaw);

  if (!ref || isNaN(weekNumber) || weekNumber < 1 || typeof teamId !== "string") {
    res.setHeader("X-Cache", "BYPASS");
    res.status(400).json({
      error: "Required query params: leagueId, year, season, weekNum, teamId",
    });
    return;
  }

  const key = `${cacheKey("matchup-preview", ref.leagueId, ref.year, ref.season, weekNumber)}:${teamId}`;

  try {
    const isHit = cache.get(key) !== undefined;
    const preview = await cache.getOrFetch(key, TTL.SCORES, () =>
      buildMatchupPreview(ref, weekNumber, teamId as TeamId)
    );
    res.setHeader("X-Cache", isHit ? "HIT" : "MISS");
    res.json(preview);
  } catch (err) {
    res.setHeader("X-Cache", "BYPASS");
    if (err instanceof Error && err.message.startsWith("NOT_FOUND:")) {
      res.status(404).json({ error: err.message.slice("NOT_FOUND:".length) });
    } else {
      console.error(err);
      res.status(502).json({ error: "Failed to fetch data from LeagueSecretary" });
    }
  }
});
