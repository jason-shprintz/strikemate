import {
  fetchBowlerList,
  fetchStandings,
  fetchWeekScores,
  mapBowler,
  mapSeries,
  mapTeamStanding,
} from "@strikemate/leaguesecretary-client";
import type { LeagueId, WeekId } from "@strikemate/types";
import { Router } from "express";

export const leagueRouter = Router();

// GET /league/:leagueId/standings
// Returns current team standings mapped to domain types
leagueRouter.get("/:leagueId/standings", async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    if (isNaN(leagueId)) {
      res.status(400).json({ error: "Invalid leagueId" });
      return;
    }
    const raw = await fetchStandings(leagueId);
    const standings = raw.map((s) =>
      mapTeamStanding(s, String(leagueId) as LeagueId)
    );
    res.json(standings);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch standings from LeagueSecretary" });
  }
});

// GET /league/:leagueId/bowlers
// Returns full bowler list mapped to domain types
leagueRouter.get("/:leagueId/bowlers", async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    if (isNaN(leagueId)) {
      res.status(400).json({ error: "Invalid leagueId" });
      return;
    }
    const raw = await fetchBowlerList(leagueId);
    const bowlers = raw.map((b) =>
      mapBowler(b, String(leagueId) as LeagueId)
    );
    res.json(bowlers);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch bowlers from LeagueSecretary" });
  }
});

// GET /league/:leagueId/scores/:weekNumber
// Returns all bowler series for a given week mapped to domain types
leagueRouter.get("/:leagueId/scores/:weekNumber", async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    const weekNumber = Number(req.params.weekNumber);
    if (isNaN(leagueId) || isNaN(weekNumber)) {
      res.status(400).json({ error: "Invalid leagueId or weekNumber" });
      return;
    }
    const raw = await fetchWeekScores(leagueId, weekNumber);
    const weekId = `${leagueId}-w${weekNumber}` as WeekId;
    const series = raw.map((s) =>
      mapSeries(s, String(leagueId) as LeagueId, weekId)
    );
    res.json(series);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch scores from LeagueSecretary" });
  }
});
