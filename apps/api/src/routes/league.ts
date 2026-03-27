import {
  fetchBowlerList,
  fetchStandings,
  fetchWeekScores,
  mapBowler,
  mapSeries,
  mapTeamStanding,
} from "@strikemate/leaguesecretary-client";
import type { LSLeagueRef } from "@strikemate/leaguesecretary-client";
import type { LeagueId, WeekId } from "@strikemate/types";
import { Router } from "express";

export const leagueRouter = Router();

/**
 * All league routes require three query params that identify the league:
 *   ?centerSlug=sun-coast-hotel-casino
 *   &leagueSlug=sunday-fun-winter-2526
 *   &leagueId=131919
 *
 * Example:
 *   GET /league/standings?centerSlug=sun-coast-hotel-casino&leagueSlug=sunday-fun-winter-2526&leagueId=131919
 */
function parseLeagueRef(query: Record<string, unknown>): LSLeagueRef | null {
  const { centerSlug, leagueSlug, leagueId } = query;
  if (
    typeof centerSlug !== "string" ||
    typeof leagueSlug !== "string" ||
    typeof leagueId !== "string" ||
    isNaN(Number(leagueId))
  ) {
    return null;
  }
  return { centerSlug, leagueSlug, leagueId: Number(leagueId) };
}

// GET /league/standings?centerSlug=...&leagueSlug=...&leagueId=...
leagueRouter.get("/standings", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  if (!ref) {
    res.status(400).json({ error: "Missing or invalid centerSlug, leagueSlug, or leagueId" });
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

// GET /league/bowlers?centerSlug=...&leagueSlug=...&leagueId=...
leagueRouter.get("/bowlers", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  if (!ref) {
    res.status(400).json({ error: "Missing or invalid centerSlug, leagueSlug, or leagueId" });
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

// GET /league/scores/:weekNumber?centerSlug=...&leagueSlug=...&leagueId=...
leagueRouter.get("/scores/:weekNumber", async (req, res) => {
  const ref = parseLeagueRef(req.query as Record<string, unknown>);
  const weekNumber = Number(req.params.weekNumber);
  if (!ref || isNaN(weekNumber)) {
    res.status(400).json({ error: "Missing or invalid params" });
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
