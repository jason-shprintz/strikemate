import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DEFAULT_WEEK,
  HANDICAP_BASIS,
  HANDICAP_PERCENT,
  MY_TEAM_ID,
} from "../config";
import type {
  MatchupBowler,
  MatchupPreviewData,
} from "../hooks/useMatchupPreview";
import { useMatchupPreview } from "../hooks/useMatchupPreview";
import { colors } from "../theme";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Computes the handicap for a given average using the league HandicapConfig. */
function handicapFor(avg: number): number {
  return Math.max(0, Math.floor((HANDICAP_BASIS - avg) * HANDICAP_PERCENT));
}

/** How many pins needed to achieve a new average after one more series (3 games). */
function pinsNeeded(
  totalPins: number,
  totalGames: number,
  targetAvg: number,
): number {
  return Math.ceil(targetAvg * (totalGames + 3) - totalPins);
}

/** Displays a bowler's current average, defaulting to "—". */
function fmtAvg(avg?: number): string {
  return avg !== undefined ? String(Math.round(avg)) : "—";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Renders 5 filled/empty dots representing recent weekly points (0–4 each). */
function FormDots({ points }: { points: number[] }) {
  if (points.length === 0) {
    return <Text style={styles.formEmpty}>No data</Text>;
  }
  return (
    <View style={styles.formRow}>
      {points.map((p, i) => (
        <View
          key={i}
          style={[
            styles.formDot,
            p >= 3 && styles.formDotGood,
            p <= 1 && styles.formDotBad,
          ]}
        >
          <Text style={styles.formDotText}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

/** Opponent section: team average, recent form. */
function OpponentCard({
  preview,
  isHome,
}: {
  preview: MatchupPreviewData;
  isHome: boolean;
}) {
  const oppTeam = isHome ? preview.awayTeam : preview.homeTeam;
  const oppBowlers = isHome ? preview.awayBowlers : preview.homeBowlers;
  const oppPoints = isHome
    ? preview.recentForm.awayTeamPoints
    : preview.recentForm.homeTeamPoints;
  const myPoints = isHome
    ? preview.recentForm.homeTeamPoints
    : preview.recentForm.awayTeamPoints;

  const activeOppBowlers = oppBowlers.filter(
    (b) => b.currentAverage !== undefined && b.currentAverage > 0,
  );
  const teamAvg =
    activeOppBowlers.length > 0
      ? Math.round(
          activeOppBowlers.reduce((s, b) => s + (b.currentAverage ?? 0), 0) /
            activeOppBowlers.length,
        )
      : undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Upcoming Opponent</Text>
      <Text style={styles.oppName}>{oppTeam.name}</Text>
      {teamAvg !== undefined && (
        <Text style={styles.oppAvg}>Team average: {teamAvg}</Text>
      )}
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Their recent form (pts/wk):</Text>
        <FormDots points={oppPoints} />
      </View>
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Your recent form (pts/wk):</Text>
        <FormDots points={myPoints} />
      </View>
    </View>
  );
}

/** Head-to-head record section. */
function HeadToHeadCard({
  preview,
  isHome,
}: {
  preview: MatchupPreviewData;
  isHome: boolean;
}) {
  const { headToHead } = preview;
  const myTeam = isHome ? preview.homeTeam : preview.awayTeam;
  const oppTeam = isHome ? preview.awayTeam : preview.homeTeam;
  const myWins = isHome ? headToHead.teamAWins : headToHead.teamBWins;
  const oppWins = isHome ? headToHead.teamBWins : headToHead.teamAWins;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Head-to-Head Record</Text>
      {headToHead.meetings.length === 0 ? (
        <Text style={styles.emptyNote}>First meeting this season</Text>
      ) : (
        <>
          <View style={styles.h2hScoreboard}>
            <View style={styles.h2hSide}>
              <Text style={styles.h2hTeamName} numberOfLines={1}>
                {myTeam.name}
              </Text>
              <Text
                style={[
                  styles.h2hWins,
                  myWins > oppWins && styles.h2hWinsLeading,
                ]}
              >
                {myWins}
              </Text>
            </View>
            <Text style={styles.h2hVs}>vs</Text>
            <View style={[styles.h2hSide, styles.h2hSideRight]}>
              <Text style={styles.h2hTeamName} numberOfLines={1}>
                {oppTeam.name}
              </Text>
              <Text
                style={[
                  styles.h2hWins,
                  oppWins > myWins && styles.h2hWinsLeading,
                ]}
              >
                {oppWins}
              </Text>
            </View>
          </View>
          <Text style={styles.meetingsLabel}>
            {headToHead.meetings.length} meeting
            {headToHead.meetings.length !== 1 ? "s" : ""} this season
          </Text>
        </>
      )}
    </View>
  );
}

/** Bowler vs bowler average comparison table by position. */
function BowlerComparisonCard({
  preview,
  isHome,
}: {
  preview: MatchupPreviewData;
  isHome: boolean;
}) {
  const myBowlers = isHome ? preview.homeBowlers : preview.awayBowlers;
  const oppBowlers = isHome ? preview.awayBowlers : preview.homeBowlers;

  const maxLen = Math.max(myBowlers.length, oppBowlers.length);
  if (maxLen === 0) return null;

  const rows: Array<{
    pos: number;
    mine?: MatchupBowler;
    theirs?: MatchupBowler;
  }> = [];
  for (let i = 0; i < maxLen; i++) {
    rows.push({ pos: i + 1, mine: myBowlers[i], theirs: oppBowlers[i] });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Bowler Matchups</Text>
      {/* Column headers */}
      <View style={styles.compRow}>
        <Text style={[styles.compName, styles.compHeaderText]}>
          Your Bowlers
        </Text>
        <Text style={[styles.compPos, styles.compHeaderText]}>#</Text>
        <Text
          style={[styles.compName, styles.compHeaderText, styles.compNameRight]}
        >
          Their Bowlers
        </Text>
      </View>
      {rows.map(({ pos, mine, theirs }) => {
        const myAvg = mine?.currentAverage ?? 0;
        const theirAvg = theirs?.currentAverage ?? 0;
        const myEdge = myAvg > 0 && theirAvg > 0 && myAvg > theirAvg;
        const theirEdge = myAvg > 0 && theirAvg > 0 && theirAvg > myAvg;
        return (
          <View key={pos} style={styles.compRow}>
            <View style={styles.compBowlerCell}>
              <Text
                style={[styles.compName, myEdge && styles.compEdge]}
                numberOfLines={1}
              >
                {mine ? mine.name : "—"}
              </Text>
              <Text style={styles.compAvgText}>
                {mine ? fmtAvg(mine.currentAverage) : "—"}
              </Text>
            </View>
            <Text style={styles.compPos}>{pos}</Text>
            <View style={[styles.compBowlerCell, styles.compBowlerCellRight]}>
              <Text
                style={[
                  styles.compName,
                  styles.compNameRight,
                  theirEdge && styles.compEdge,
                ]}
                numberOfLines={1}
              >
                {theirs ? theirs.name : "—"}
              </Text>
              <Text style={[styles.compAvgText, styles.compAvgRight]}>
                {theirs ? fmtAvg(theirs.currentAverage) : "—"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** "What do I need to bowl?" average raise calculator. */
function AverageCalculatorCard({
  preview,
  isHome,
}: {
  preview: MatchupPreviewData;
  isHome: boolean;
}) {
  const myBowlers = isHome ? preview.homeBowlers : preview.awayBowlers;
  const [selectedBowlerId, setSelectedBowlerId] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState("");

  // Find the selected bowler by ID, falling back to the first bowler. This
  // gracefully handles week navigation where the bowler list may change.
  const bowler =
    (selectedBowlerId
      ? myBowlers.find((b) => b.id === selectedBowlerId)
      : null) ?? myBowlers[0];

  if (!bowler || bowler.totalGames === 0) return null;

  const currentAvg =
    bowler.currentAverage ?? Math.round(bowler.totalPins / bowler.totalGames);
  const targetAvg = parseInt(targetInput, 10);
  const validTarget =
    !isNaN(targetAvg) && targetAvg > currentAvg && targetAvg <= 300;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>What Do I Need to Bowl?</Text>

      {/* Bowler selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.selectorScroll}
      >
        {myBowlers.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[
              styles.selectorBtn,
              b.id === bowler.id && styles.selectorBtnActive,
            ]}
            onPress={() => {
              setSelectedBowlerId(b.id);
              setTargetInput("");
            }}
          >
            <Text
              style={[
                styles.selectorBtnText,
                b.id === bowler.id && styles.selectorBtnTextActive,
              ]}
              numberOfLines={1}
            >
              {b.name.split(" ")[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Current stats */}
      <View style={styles.calcStats}>
        <View style={styles.calcStatItem}>
          <Text style={styles.calcStatLabel}>Current avg</Text>
          <Text style={styles.calcStatValue}>{currentAvg}</Text>
        </View>
        <View style={styles.calcStatItem}>
          <Text style={styles.calcStatLabel}>Games bowled</Text>
          <Text style={styles.calcStatValue}>{bowler.totalGames}</Text>
        </View>
        <View style={styles.calcStatItem}>
          <Text style={styles.calcStatLabel}>Handicap</Text>
          <Text style={styles.calcStatValue}>{handicapFor(currentAvg)}</Text>
        </View>
      </View>

      {/* Quick targets */}
      <Text style={styles.calcSubtitle}>Series needed to raise average:</Text>
      {[1, 3, 5].map((bump) => {
        const targetA = currentAvg + bump;
        const seriesPins = pinsNeeded(
          bowler.totalPins,
          bowler.totalGames,
          targetA,
        );
        const newHcp = handicapFor(targetA);
        return (
          <View key={bump} style={styles.calcRow}>
            <Text style={styles.calcRowLabel}>
              +{bump} pin{bump !== 1 ? "s" : ""} → avg {targetA}
            </Text>
            <View style={styles.calcRowRight}>
              <Text style={styles.calcRowValue}>{seriesPins} pins</Text>
              <Text style={styles.calcRowHcp}>(hcp {newHcp})</Text>
            </View>
          </View>
        );
      })}

      {/* Custom target */}
      <Text style={styles.calcSubtitle}>Custom target average:</Text>
      <View style={styles.calcInputRow}>
        <TextInput
          style={styles.calcInput}
          value={targetInput}
          onChangeText={setTargetInput}
          keyboardType="number-pad"
          placeholder={`> ${currentAvg}`}
          placeholderTextColor={colors.muted}
          maxLength={3}
        />
        {validTarget && (
          <View style={styles.calcInputResult}>
            <Text style={styles.calcRowValue}>
              {pinsNeeded(bowler.totalPins, bowler.totalGames, targetAvg)} pins
            </Text>
            <Text style={styles.calcRowHcp}>
              (hcp {handicapFor(targetAvg)})
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.calcNote}>
        Basis {HANDICAP_BASIS} @ {Math.round(HANDICAP_PERCENT * 100)}%
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function MatchupIntelligenceScreen() {
  const [week, setWeek] = useState(DEFAULT_WEEK);
  const { preview, status, error, refresh } = useMatchupPreview(
    MY_TEAM_ID,
    week,
  );

  if (!MY_TEAM_ID) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Team not configured</Text>
        <Text style={styles.errorDetail}>
          Set EXPO_PUBLIC_MY_TEAM_ID in your .env.local file to enable this
          screen.
        </Text>
      </View>
    );
  }

  // Determine whether MY_TEAM_ID is the home team in this matchup
  const isHome = preview ? preview.matchup.homeTeamId === MY_TEAM_ID : true;

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

      {/* Full-screen loading */}
      {status === "loading" && !preview ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading matchup intelligence…</Text>
        </View>
      ) : status === "not-found" ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No matchup scheduled for week {week}</Text>
        </View>
      ) : status === "error" ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      ) : preview ? (
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
          <OpponentCard preview={preview} isHome={isHome} />
          <HeadToHeadCard preview={preview} isHome={isHome} />
          <BowlerComparisonCard preview={preview} isHome={isHome} />
          <AverageCalculatorCard preview={preview} isHome={isHome} />
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No matchup data for week {week}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Week selector (shared with WeeklyRecapScreen)
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
  weekLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },

  // Loading / error / empty
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  loadingText: { color: colors.muted, marginTop: 8 },
  errorText: { color: colors.error, fontSize: 16, fontWeight: "600" },
  errorDetail: { color: colors.muted, fontSize: 13, textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 15 },

  // ScrollView
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 14 },

  // Shared card container
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyNote: { color: colors.muted, fontSize: 13, fontStyle: "italic" },

  // Opponent card
  oppName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  oppAvg: { color: colors.muted, fontSize: 13, marginBottom: 10 },
  formSection: { marginTop: 8 },
  formLabel: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  formRow: { flexDirection: "row", gap: 6 },
  formDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  formDotGood: { backgroundColor: "#2a7a2a" },
  formDotBad: { backgroundColor: "#7a2a2a" },
  formDotText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  formEmpty: { color: colors.muted, fontSize: 12, fontStyle: "italic" },

  // Head-to-head card
  h2hScoreboard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  h2hSide: { flex: 1, alignItems: "flex-start" },
  h2hSideRight: { alignItems: "flex-end" },
  h2hTeamName: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  h2hWins: { color: colors.text, fontSize: 32, fontWeight: "700" },
  h2hWinsLeading: { color: colors.accent },
  h2hVs: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  meetingsLabel: { color: colors.muted, fontSize: 12, fontStyle: "italic" },

  // Bowler comparison card
  compRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  compBowlerCell: { flex: 1 },
  compBowlerCellRight: { alignItems: "flex-end" },
  compHeaderText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  compName: { color: colors.text, fontSize: 13, flex: 1 },
  compNameRight: { textAlign: "right" },
  compEdge: { color: colors.accent, fontWeight: "700" },
  compPos: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    width: 24,
    textAlign: "center",
  },
  compAvgText: { color: colors.muted, fontSize: 11 },
  compAvgRight: { textAlign: "right" },

  // Calculator card
  selectorScroll: { marginBottom: 12 },
  selectorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.muted,
    marginRight: 8,
  },
  selectorBtnActive: {
    borderColor: colors.accent,
    backgroundColor: "#e05c0020",
  },
  selectorBtnText: { color: colors.muted, fontSize: 13 },
  selectorBtnTextActive: { color: colors.accent },

  calcStats: { flexDirection: "row", gap: 8, marginBottom: 12 },
  calcStatItem: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  calcStatLabel: {
    color: colors.muted,
    fontSize: 10,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  calcStatValue: { color: colors.text, fontSize: 20, fontWeight: "700" },

  calcSubtitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 10,
  },
  calcRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  calcRowLabel: { color: colors.text, fontSize: 13 },
  calcRowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  calcRowValue: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  calcRowHcp: { color: colors.muted, fontSize: 12 },

  calcInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  calcInput: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
  },
  calcInputResult: { flexDirection: "row", alignItems: "center", gap: 6 },
  calcNote: {
    color: colors.muted,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 8,
  },
});
