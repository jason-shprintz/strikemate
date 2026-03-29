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
 * All league routes require these query params:
 *   ?leagueId=131919&year=2025&season=f&weekNum=26
 */
function parseLeagueRef(query: Record<string, unknown>): LSLeagueRef | null {
  const { leagueId, year, season, weekNum } = query;
  if (
    typeof leagueId !== "string" ||
    typeof year !== "string" ||
    typeof season !== "string" ||
    typeof weekNum !== "string" ||
    isNaN(Number(leagueId)) ||
    isNaN(Number(year)) ||
    isNaN(Number(weekNum))
  ) {
    return null;
  }
  return {
    leagueId: Number(leagueId),
    year: Number(year),
    season,
    weekNum: Number(weekNum),
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

// GET /league/scores/:weekNumber?leagueId=131919&year=2025&season=f&weekNum=26
leagueRouter.get("/scores/:weekNumber", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  const weekNumber = Number(req.params.weekNumber);
  if (!ref || isNaN(weekNumber)) {
    res.status(400).json({ error: "Required query params: leagueId, year, season, weekNum" });
    return;
  }
  try {
    const raw = await fetchWeekScores(ref, weekNumber);
    const weekId = `${ref.leagueId}-w${weekNumber}` as WeekId;
    const series = raw.map((s) => mapSeries(s, String(ref.leagueId) as LeagueId, weekId));
    res.json(series);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch scores from LeagueSecretary" });
  }
});

// GET /league/matchups/:weekNumber?leagueId=131919&year=2025&season=f&weekNum=26
// Derives matchups by grouping bowlers by the lane they bowled on.
leagueRouter.get("/matchups/:weekNumber", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  const weekNumber = Number(req.params.weekNumber);
  if (!ref || isNaN(weekNumber)) {
    res.status(400).json({ error: "Required query params: leagueId, year, season, weekNum" });
    return;
  }
  try {
    const raw = await fetchWeekScores(ref, weekNumber);
    const weekId = `${ref.leagueId}-w${weekNumber}` as WeekId;
    const matchups = deriveMatchups(raw, String(ref.leagueId) as LeagueId, weekId);
    res.json(matchups);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to derive matchups from LeagueSecretary" });
  }
});
