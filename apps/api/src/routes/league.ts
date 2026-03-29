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
import { Router } from "express";

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
    // weekNum defaults to 0 when not required — callers override it with the path param
    weekNum: typeof weekNum === "string" ? Number(weekNum) : 0,
  };
}

// GET /league/standings?leagueId=131919&year=2025&season=f&weekNum=26
leagueRouter.get("/standings", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  if (!ref) {
    res.status(400).json({ error: "Required query params: leagueId, year, season, weekNum" });
    return;
  }
  try {
    const raw = await fetchStandings(ref);
    const standings = raw.map((s) => mapTeamStanding(s, String(ref.leagueId) as LeagueId));
    res.json(standings);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch standings from LeagueSecretary" });
  }
});

// GET /league/bowlers?leagueId=131919&year=2025&season=f&weekNum=26
leagueRouter.get("/bowlers", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  if (!ref) {
    res.status(400).json({ error: "Required query params: leagueId, year, season, weekNum" });
    return;
  }
  try {
    const raw = await fetchBowlerList(ref);
    const bowlers = raw.map((b) => mapBowler(b, String(ref.leagueId) as LeagueId));
    res.json(bowlers);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch bowlers from LeagueSecretary" });
  }
});

// GET /league/scores/:weekNumber?leagueId=131919&year=2025&season=f
// weekNum is optional here — :weekNumber in the path is the source of truth
leagueRouter.get("/scores/:weekNumber", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>, false);
  const weekNumber = Number(req.params.weekNumber);
  if (!ref || isNaN(weekNumber)) {
    res.status(400).json({ error: "Required query params: leagueId, year, season" });
    return;
  }
  try {
    const raw = await fetchWeekScores({ ...ref, weekNum: weekNumber }, weekNumber);
    const weekId = `${ref.leagueId}-w${weekNumber}` as WeekId;
    const series = raw.map((s) => mapSeries(s, String(ref.leagueId) as LeagueId, weekId));
    res.json(series);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch scores from LeagueSecretary" });
  }
});

// GET /league/matchups/:weekNumber?leagueId=131919&year=2025&season=f
// weekNum is optional here — :weekNumber in the path is the source of truth
leagueRouter.get("/matchups/:weekNumber", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>, false);
  const weekNumber = Number(req.params.weekNumber);
  if (!ref || isNaN(weekNumber)) {
    res.status(400).json({ error: "Required query params: leagueId, year, season" });
    return;
  }
  try {
    const raw = await fetchWeekScores({ ...ref, weekNum: weekNumber }, weekNumber);
    const weekId = `${ref.leagueId}-w${weekNumber}` as WeekId;
    const matchups = deriveMatchups(raw, String(ref.leagueId) as LeagueId, weekId);
    res.json(matchups);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to derive matchups from LeagueSecretary" });
  }
});
