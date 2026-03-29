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
 * 2. Within each lane group, find the rostered team (filter out TeamID 0)
 * 3. Derive physical cross-lane pairs (odd lane paired with odd+1)
 * 4. Return one Matchup per pair where both lanes have a rostered team
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

  // Step 2: find the rostered team per lane, typed as TeamId from the start
  const teamByLane = new Map<number, TeamId>();
  for (const [lane, laneScores] of byLane) {
    const rostered = laneScores.filter((s) => s.TeamID !== 0);
    if (rostered.length === 0) continue;
    // All rostered bowlers on a lane belong to the same team
    teamByLane.set(lane, String(rostered[0]!.TeamID) as TeamId);
  }

  // Step 3: derive physical cross-lane pairs (odd lane with odd+1 even lane).
  // We collect unique min-max pair keys from the lanes present in byLane,
  // then only create a matchup if both lanes have a rostered team.
  // This prevents mispairing when a lane is skipped due to having only subs.
  const lanePairKeys = new Set<string>();
  for (const lane of byLane.keys()) {
    const isOdd = lane % 2 === 1;
    const partnerLane = isOdd ? lane + 1 : lane - 1;
    if (!byLane.has(partnerLane)) continue; // partner lane not in this week's data
    const laneA = Math.min(lane, partnerLane);
    const laneB = Math.max(lane, partnerLane);
    lanePairKeys.add(`${laneA}-${laneB}`);
  }

  // Step 4: build matchups from valid pairs in ascending lane order
  const sortedPairKeys = [...lanePairKeys].sort((a, b) => {
    const aStart = Number(a.split("-")[0]);
    const bStart = Number(b.split("-")[0]);
    return aStart - bStart;
  });

  const matchups: Matchup[] = [];
  for (const pairKey of sortedPairKeys) {
    const [laneAStr, laneBStr] = pairKey.split("-");
    const laneA = Number(laneAStr);
    const laneB = Number(laneBStr);
    const homeTeamId = teamByLane.get(laneA);
    const awayTeamId = teamByLane.get(laneB);

    // Skip the entire pair if either lane lacks a rostered team
    if (!homeTeamId || !awayTeamId) continue;

    matchups.push({
      id: `${weekId}-lanes-${laneA}-${laneB}` as MatchupId,
      weekId,
      leagueId,
      lanes: [laneA, laneB],
      homeTeamId,
      awayTeamId,
    });
  }

  return matchups;
}
