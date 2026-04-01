import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BowlersScreen } from "./src/screens/BowlersScreen";
import { MatchupIntelligenceScreen } from "./src/screens/MatchupIntelligenceScreen";
import { StandingsScreen } from "./src/screens/StandingsScreen";
import { WeeklyRecapScreen } from "./src/screens/WeeklyRecapScreen";
import { colors } from "./src/theme";

type Tab = "standings" | "bowlers" | "recap" | "matchup";

const TABS: { key: Tab; label: string }[] = [
  { key: "standings", label: "Standings" },
  { key: "bowlers", label: "Bowlers" },
  { key: "recap", label: "Recap" },
  { key: "matchup", label: "Matchup" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("standings");

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ StrikeMate</Text>
        <Text style={styles.headerSub}>Sunday Fun Winter 25-26</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text
              style={[styles.tabText, tab === key && styles.tabTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Screen content */}
      <View style={styles.content}>
        {tab === "standings" ? (
          <StandingsScreen />
        ) : tab === "bowlers" ? (
          <BowlersScreen />
        ) : tab === "recap" ? (
          <WeeklyRecapScreen />
        ) : (
          <MatchupIntelligenceScreen />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, marginTop: 50 },

  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: "700" },
  headerSub: { color: colors.muted, fontSize: 13, marginTop: 2 },

  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.accent },

  content: { flex: 1 },
});
