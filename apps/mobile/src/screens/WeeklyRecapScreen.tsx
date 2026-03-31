import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DEFAULT_WEEK } from "../config";
import type { BowlerScore, MatchupRecap, TeamScore } from "../hooks/useWeekScores";
import { useWeekScores } from "../hooks/useWeekScores";
import { colors } from "../theme";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColHeader() {
  return (
    <View style={styles.dataRow}>
      <Text style={[styles.nameCell, styles.colHeaderText]}>Bowler</Text>
      <Text style={[styles.gameCell, styles.colHeaderText]}>G1</Text>
      <Text style={[styles.gameCell, styles.colHeaderText]}>G2</Text>
      <Text style={[styles.gameCell, styles.colHeaderText]}>G3</Text>
      <Text style={[styles.totalCell, styles.colHeaderText]}>SCR</Text>
      <Text style={[styles.hcpCell, styles.colHeaderText]}>HCP</Text>
    </View>
  );
}

function BowlerRow({ bowler }: { bowler: BowlerScore }) {
  const isAbsent = bowler.status === "absent";

  const gameText = (g: number | undefined) =>
    isAbsent ? "—" : g !== undefined ? String(g) : "—";

  return (
    <View style={styles.dataRow}>
      <Text
        style={[styles.nameCell, isAbsent && styles.absentText]}
        numberOfLines={1}
      >
        {bowler.name}
        {isAbsent ? " ✗" : ""}
      </Text>
      <Text style={[styles.gameCell, isAbsent && styles.absentText]}>
        {gameText(bowler.games[0])}
      </Text>
      <Text style={[styles.gameCell, isAbsent && styles.absentText]}>
        {gameText(bowler.games[1])}
      </Text>
      <Text style={[styles.gameCell, isAbsent && styles.absentText]}>
        {gameText(bowler.games[2])}
      </Text>
      <Text style={[styles.totalCell, isAbsent && styles.absentText]}>
        {isAbsent ? "—" : bowler.scratchTotal}
      </Text>
      <Text style={[styles.hcpCell, isAbsent && styles.absentText]}>
        {isAbsent ? "—" : bowler.handicapTotal}
      </Text>
    </View>
  );
}

function TotalRow({ team }: { team: TeamScore }) {
  return (
    <View style={[styles.dataRow, styles.totalRow]}>
      <Text style={[styles.nameCell, styles.totalLabel]}>Total</Text>
      <Text style={styles.gameCell} />
      <Text style={styles.gameCell} />
      <Text style={styles.gameCell} />
      <Text style={[styles.totalCell, styles.totalValue]}>
        {team.scratchTotal}
      </Text>
      <Text style={[styles.hcpCell, styles.totalValue]}>
        {team.handicapTotal}
      </Text>
    </View>
  );
}

function TeamCard({
  team,
  isWinner,
}: {
  team: TeamScore;
  isWinner: boolean;
}) {
  return (
    <View style={styles.teamCard}>
      {/* Team header */}
      <View style={[styles.teamHeader, isWinner && styles.teamHeaderWinner]}>
        <Text
          style={[styles.teamName, isWinner && styles.teamNameWinner]}
          numberOfLines={1}
        >
          {isWinner ? "🏆 " : ""}
          {team.teamName}
        </Text>
        <View style={[styles.pointsBadge, isWinner && styles.pointsBadgeWinner]}>
          <Text style={[styles.pointsText, isWinner && styles.pointsTextWinner]}>
            {team.points} pts
          </Text>
        </View>
      </View>

      <ColHeader />

      {team.bowlers.map((b) => (
        <BowlerRow key={b.bowlerId} bowler={b} />
      ))}

      <TotalRow team={team} />
    </View>
  );
}

function MatchupCard({ matchup }: { matchup: MatchupRecap }) {
  const homeWins = matchup.home.points > matchup.away.points;
  const awayWins = matchup.away.points > matchup.home.points;

  return (
    <View style={styles.matchupCard}>
      <View style={styles.matchupHeader}>
        <Text style={styles.lanesText}>
          Lanes {matchup.lanes[0]}–{matchup.lanes[1]}
        </Text>
      </View>

      <TeamCard team={matchup.home} isWinner={homeWins} />

      <View style={styles.vsDivider}>
        <View style={styles.vsDividerLine} />
        <Text style={styles.vsText}>VS</Text>
        <View style={styles.vsDividerLine} />
      </View>

      <TeamCard team={matchup.away} isWinner={awayWins} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function WeeklyRecapScreen() {
  const [week, setWeek] = useState(DEFAULT_WEEK);
  const { matchups, status, error, refresh } = useWeekScores(week);

  return (
    <View style={styles.container}>
      {/* Week selector */}
      <View style={styles.weekSelector}>
        <TouchableOpacity
          style={[styles.weekNavBtn, week <= 1 && styles.weekNavBtnDisabled]}
          onPress={() => setWeek((w) => Math.max(1, w - 1))}
          disabled={week <= 1}
        >
          <Text
            style={[
              styles.weekNavText,
              week <= 1 && styles.weekNavTextDisabled,
            ]}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.weekLabel}>Week {week}</Text>

        <TouchableOpacity
          style={styles.weekNavBtn}
          onPress={() => setWeek((w) => w + 1)}
        >
          <Text style={styles.weekNavText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Loading state (initial only) */}
      {status === "loading" && matchups.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : status === "error" ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={status === "loading"}
              onRefresh={refresh}
              tintColor={colors.accent}
            />
          }
        >
          {matchups.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No scores for week {week}</Text>
            </View>
          ) : (
            matchups.map((m) => <MatchupCard key={m.id} matchup={m} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GAME_COL = 36;
const TOTAL_COL = 44;
const HCP_COL = 44;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Week selector
  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekNavBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  weekNavBtnDisabled: { borderColor: colors.separator },
  weekNavText: { color: colors.text, fontSize: 22, lineHeight: 26 },
  weekNavTextDisabled: { color: colors.separator },
  weekLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  // Loading / error / empty
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 60,
  },
  loadingText: { color: colors.muted, marginTop: 8 },
  errorText: { color: colors.error, fontSize: 16, fontWeight: "600" },
  errorDetail: { color: colors.muted, fontSize: 13 },
  emptyText: { color: colors.muted, fontSize: 15 },

  // ScrollView
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 16 },

  // Matchup card
  matchupCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchupHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lanesText: { color: colors.muted, fontSize: 12, fontWeight: "600" },

  // VS divider
  vsDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  vsDividerLine: { flex: 1, height: 1, backgroundColor: colors.separator },
  vsText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginHorizontal: 8,
  },

  // Team card
  teamCard: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginBottom: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    backgroundColor: "transparent",
  },
  teamHeaderWinner: { backgroundColor: "#e05c0015" },
  teamName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700" },
  teamNameWinner: { color: colors.accent },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.muted,
    marginLeft: 8,
  },
  pointsBadgeWinner: { borderColor: colors.accent, backgroundColor: "#e05c0025" },
  pointsText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  pointsTextWinner: { color: colors.accent },

  // Data rows (col header, bowler rows, total row)
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  colHeaderText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  nameCell: { flex: 1, color: colors.text, fontSize: 13, paddingRight: 4 },
  gameCell: {
    width: GAME_COL,
    color: colors.text,
    fontSize: 13,
    textAlign: "center",
  },
  totalCell: {
    width: TOTAL_COL,
    color: colors.text,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  hcpCell: {
    width: HCP_COL,
    color: colors.accent,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  absentText: { color: colors.muted, fontStyle: "italic" },

  // Total row
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    marginTop: 2,
    paddingTop: 4,
  },
  totalLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  totalValue: { fontSize: 14, fontWeight: "700" },
});
