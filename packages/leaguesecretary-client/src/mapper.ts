import type {
  Bowler,
  BowlerId,
  BowlerStatus,
  LeagueId,
  Series,
  TeamId,
  TeamStanding,
  WeekId,
} from "@strikemate/types";
import type { LSBowler, LSTeamStanding, LSWeekScore } from "./ls-types.js";

// LS stores names as "LastName, FirstName" — normalize to "FirstName LastName"
function normalizeName(lsName: string): string {
  const commaIndex = lsName.indexOf(", ");
  if (commaIndex === -1) return lsName;
  const last = lsName.slice(0, commaIndex);
  const first = lsName.slice(commaIndex + 2);
  return `${first} ${last}`;
}

function mapBowlerStatus(ls: LSBowler): BowlerStatus {
  if (ls.BowlerStatus === "T" && ls.TeamID === 0) return "sub";
  return "active";
}

export function mapBowler(ls: LSBowler, leagueId: LeagueId): Bowler {
  return {
    id: String(ls.BowlerID) as BowlerId,
    leagueId,
    teamId: String(ls.TeamID) as TeamId,
    name: normalizeName(ls.BowlerName),
    enteringAverage: ls.EnteringAverage > 0 ? ls.EnteringAverage : undefined,
    currentAverage: ls.Average,
    totalPins: ls.TotalPins,
    totalGames: ls.TotalGames,
  };
}

export function mapTeamStanding(
  ls: LSTeamStanding,
  leagueId: LeagueId
): TeamStanding {
  return {
    teamId: String(ls.TeamID) as TeamId,
    leagueId,
    rank: ls.Place,
    wins: ls.PointsWonSplit,
    losses: ls.PointsLostSplit,
    ties: 0, // not surfaced in this endpoint
    totalPoints: ls.PointsWonYTD,
    totalPins: ls.TotalPinsSplit,
  };
}

export function mapSeries(
  ls: LSWeekScore,
  leagueId: LeagueId,
  weekId: WeekId
): Series {
  const isAbsent = ls.ScoreType1 === "A";

  const games: [number?, number?, number?] = [
    ls.ScoreType1 === "S" || ls.ScoreType1 === "I" ? ls.Score1 : undefined,
    ls.ScoreType2 === "S" || ls.ScoreType2 === "I" ? ls.Score2 : undefined,
    ls.ScoreType3 === "S" || ls.ScoreType3 === "I" ? ls.Score3 : undefined,
  ];

  return {
    bowlerId: String(ls.BowlerID) as BowlerId,
    weekId,
    teamId: String(ls.TeamID) as TeamId,
    status: isAbsent ? "absent" : "active",
    games,
    scratchTotal: ls.SeriesTotal,
    // HandicapBeforeBowling is the per-game handicap; multiply by 3 for series
    handicap: ls.HandicapBeforeBowling * 3,
    handicapTotal: ls.HandicapSeriesTotal,
  };
}
