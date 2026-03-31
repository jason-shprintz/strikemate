import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useStandings } from "../hooks/useStandings";
import { colors } from "../theme";

export function StandingsScreen() {
  const { standings, status, error, refresh } = useStandings();
  if (status === "loading" && standings.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={standings}
      keyExtractor={(item) => item.teamId}
      refreshControl={
        <RefreshControl
          refreshing={status === "loading"}
          onRefresh={refresh}
          tintColor={colors.accent}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.rank}>#{item.rank}</Text>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{item.teamName}</Text>
            <Text style={styles.rowSub}>
              {item.wins}W – {item.losses}L · {item.totalPoints} pts
            </Text>
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.bg,
  },
  loadingText: { color: colors.muted, marginTop: 8 },
  errorText: { color: colors.error, fontSize: 16, fontWeight: "600" },
  errorDetail: { color: colors.muted, fontSize: 13 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
  },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  rowSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  rank: { color: colors.accent, fontWeight: "700", fontSize: 16, width: 36 },
  sep: { height: 1, backgroundColor: colors.separator, marginHorizontal: 16 },
});
