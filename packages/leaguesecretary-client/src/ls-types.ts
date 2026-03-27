// Raw response types from LeagueSecretary API — do not use these in app code.
// The mapper in mapper.ts converts these to @strikemate/types domain objects.

export interface LSApiResponse<T> {
  Data: T[];
  Total: number;
  AggregateResults: null;
  Errors: null;
}

export interface LSTeamStanding {
  TeamID: number;
  TeamNum: number;
  TeamName: string;
  TeamNameURLFormated: string;
  TeamDivision: number;
  Place: number;
  PointsWonSplit: number;
  PointsLostSplit: number;
  AverageAfterBowling: number;
  TotalPinsSplit: number;
  HighScratchGame: number;
  HighScratchSeries: number;
  PointsWonYTD: number;
  PercentWinLoss: number;
}

export interface LSBowler {
  TeamID: number;
  TeamName: string;
  TeamNameURLFormated: string;
  BowlerID: number;
  BowlerName: string;           // "LastName, FirstName"
  BowlerNameURLFormated: string;
  Gender: "M" | "W";
  TotalPins: number;
  TotalGames: number;
  Average: number;
  ScratchHandicapFlag: boolean;
  HandicapAfterBowling: number;
  HighHandicapGame: number;
  HighHandicapSeries: number;
  HighScratchGame: number;
  HighScratchSeries: number;
  MostImproved: number;
  BowlerPosition: number;       // 0 = sub, 1-4 = roster position
  BowlerStatus: "R" | "T";     // R = regular, T = temporary/sub
  TeamNum: number;
  EnteringAverage: number;
  PointsWonDec: number;
}

// ScoreType values observed in the wild:
// "S" = scratch (actual score bowled)
// "A" = absent (filled with average; SeriesTotal will be 0)
// "I" = incomplete
// "0" = unused game slot (GameNum will also be 0)
export type LSScoreType = "S" | "A" | "I" | "0";

export interface LSWeekScore {
  BowlerID: number;
  BowlerName: string;
  TeamID: number;
  TeamName: string;
  AverageBeforeBowling: number;
  HandicapBeforeBowling: number;
  GameNum1: number;
  ScoreType1: LSScoreType;
  Score1: number;
  GameNum2: number;
  ScoreType2: LSScoreType;
  Score2: number;
  GameNum3: number;
  ScoreType3: LSScoreType;
  Score3: number;
  // Games 4-6 exist in schema but are unused in standard 3-game leagues
  GameNum4: number;
  ScoreType4: LSScoreType;
  Score4: number;
  GameNum5: number;
  ScoreType5: LSScoreType;
  Score5: number;
  GameNum6: number;
  ScoreType6: LSScoreType;
  Score6: number;
  SeriesTotal: number;          // 0 if absent
  HandicapSeriesTotal: number;  // 0 if absent
  PlusMinusAverage: number;
  TeamNum: number;
  LaneBowledOn: number;
  Gender: "M" | "W";
}
