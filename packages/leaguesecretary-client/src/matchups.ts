import type { LeagueId, Matchup, MatchupId, TeamId, WeekId } from "@strikemate/types";
import type { LSWeekScore } from "./ls-types.js";

/**
 * Derives matchups from weekly score data by grouping bowlers by the lane
 * they bowled on. In standard bowling leagues, two teams share a cross-lane
 * pair (e.g. lanes 5 & 6) for a matchup. All bowlers from the same team
 * will have the same LaneBowledOn value.
 *
 * Algorithm:
 * 1. Group scores by LaneBowledOn
 * 2. Within each lane group, find the unique teams
 * 3. Pair lanes in ascending order to form cross-lane matchup pairs
 * 4. Return one Matchup per pair
 */
export function deriveMatchups(
  scores: LSWeekScore[],
  leagueId: LeagueId,
  weekId: WeekId
): Matchup[] {
  // Step 1: group scores by lane
  const byLane = new Map<number, LSWeekScore[]>();
  for (const score of scores) {
    if (score.LaneBowledOn === 0) continue; // skip unassigned
    const existing = byLane.get(score.LaneBowledOn);
    if (existing) {
      existing.push(score);
    } else {
      byLane.set(score.LaneBowledOn, [score]);
    }
  }

  // Step 2: find unique team per lane
  const teamByLane = new Map<number, string>(); // lane -> teamId
  for (const [lane, laneScores] of byLane) {
    // Filter out subs (TeamID 0) to find the actual rostered team on this lane
    const rostered = laneScores.filter((s) => s.TeamID !== 0);
    if (rostered.length === 0) continue;
    // All rostered bowlers on a lane belong to the same team
    const teamId = String(rostered[0]!.TeamID);
    teamByLane.set(lane, teamId);
  }

  // Step 3: pair lanes in ascending order (odd lane pairs with next even lane)
  // Lanes are sorted and paired: [lane1, lane2], [lane3, lane4], etc.
  const sortedLanes = [...teamByLane.keys()].sort((a, b) => a - b);
  const matchups: Matchup[] = [];

  for (let i = 0; i < sortedLanes.length - 1; i += 2) {
    const laneA = sortedLanes[i]!;
    const laneB = sortedLanes[i + 1]!;
    const homeTeamId = teamByLane.get(laneA);
    const awayTeamId = teamByLane.get(laneB);

    if (!homeTeamId || !awayTeamId) continue;

    matchups.push({
      id: `${weekId}-lanes-${laneA}-${laneB}` as MatchupId,
      weekId,
      leagueId,
      lanes: [laneA, laneB],
      homeTeamId: homeTeamId as TeamId,
      awayTeamId: awayTeamId as TeamId,
    });
  }

  return matchups;
}
