import {
  fetchBowlerList,
  fetchStandings,
  fetchWeekScores,
  mapBowler,
  mapSeries,
  mapTeamStanding,
  deriveMatchups,
} from "@strikemate/leaguesecretary-client";
import type { LSLeagueRef } from "@strikemate/leaguesecretary-client";
import type { LeagueId, WeekId } from "@strikemate/types";
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
