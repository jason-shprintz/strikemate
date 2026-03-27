// ─── Primitives ─────────────────────────────────────────────────────────────

/** ISO 8601 date string, e.g. "2024-09-05" */
export type DateString = string;

/** Opaque ID type — string at runtime, branded for type safety */
export type ID<T extends string> = string & { readonly __brand: T };

export type LeagueId  = ID<"League">;
export type TeamId    = ID<"Team">;
export type BowlerId  = ID<"Bowler">;
export type WeekId    = ID<"Week">;
export type MatchupId = ID<"Matchup">;

// ─── Handicap ────────────────────────────────────────────────────────────────

export interface HandicapConfig {
  basis: number;
  percent: number; // 0–1
}

// ─── League ──────────────────────────────────────────────────────────────────

export type LeagueStatus = "active" | "completed" | "upcoming";

export interface League {
  id: LeagueId;
  name: string;
  season: string;
  center: string;
  dayOfWeek: string;
  status: LeagueStatus;
  handicapConfig: HandicapConfig;
  totalWeeks: number;
  usbcCertNumber?: string;
  dataSource: "leaguesecretary" | "native";
  externalId?: string;
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface Team {
  id: TeamId;
  leagueId: LeagueId;
  name: string;
  laneAssignment?: number;
}

// ─── Bowler ──────────────────────────────────────────────────────────────────

export type BowlerStatus = "active" | "sub" | "absent" | "vacancy";

export interface Bowler {
  id: BowlerId;
  leagueId: LeagueId;
  teamId: TeamId;
  name: string;
  enteringAverage?: number;
  currentAverage?: number;
  totalPins: number;
  totalGames: number;
  usbcId?: string;
}

// ─── Week / Session ──────────────────────────────────────────────────────────

export interface Week {
  id: WeekId;
  leagueId: LeagueId;
  weekNumber: number;
  date: DateString;
  isCompleted: boolean;
}

// ─── Matchup ─────────────────────────────────────────────────────────────────

export interface Matchup {
  id: MatchupId;
  weekId: WeekId;
  leagueId: LeagueId;
  lanes: [number, number];
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homePoints?: number;
  awayPoints?: number;
}

// ─── Series ──────────────────────────────────────────────────────────────────

export interface Series {
  bowlerId: BowlerId;
  weekId: WeekId;
  teamId: TeamId;
  status: BowlerStatus;
  games: [number?, number?, number?];
  scratchTotal: number;
  handicap: number;
  handicapTotal: number;
}

// ─── Standings ───────────────────────────────────────────────────────────────

export interface TeamStanding {
  teamId: TeamId;
  leagueId: LeagueId;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
  totalPins: number;
}

// ─── Matchup Intelligence ────────────────────────────────────────────────────

export interface HeadToHeadRecord {
  leagueId: LeagueId;
  teamAId: TeamId;
  teamBId: TeamId;
  teamAWins: number;
  teamBWins: number;
  meetings: Array<{
    weekId: WeekId;
    teamAPoints: number;
    teamBPoints: number;
  }>;
}

export interface MatchupPreview {
  matchup: Matchup;
  homeTeam: Team;
  awayTeam: Team;
  homeBowlers: Bowler[];
  awayBowlers: Bowler[];
  headToHead: HeadToHeadRecord;
  recentForm: {
    homeTeamPoints: number[];
    awayTeamPoints: number[];
  };
}