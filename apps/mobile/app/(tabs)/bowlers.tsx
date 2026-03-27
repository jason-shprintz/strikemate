import { useBowlers } from "../../hooks/useBowlers";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

export default function BowlersScreen() {
  const state = useBowlers();

  if (state.status === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e05c00" />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Failed to load bowlers</Text>
        <Text style={styles.errorDetail}>{state.message}</Text>
      </View>
    );
  }

  // Only show active roster members (filter out unrostered subs)
  const roster = state.data.filter((b) => b.teamId !== "0");

  return (
    <FlatList
      style={styles.list}
      data={roster}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.bowlerInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.team} numberOfLines={1}>{item.teamId}</Text>
          </View>
          <View style={styles.stats}>
            <Text style={styles.average}>{item.currentAverage}</Text>
            <Text style={styles.averageLabel}>avg</Text>
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1a2e" },
  error: { color: "#ff6b6b", fontSize: 16, fontWeight: "600" },
  errorDetail: { color: "#888", fontSize: 13, marginTop: 4 },
  list: { flex: 1, backgroundColor: "#1a1a2e" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  bowlerInfo: { flex: 1 },
  name: { color: "#fff", fontSize: 15, fontWeight: "600" },
  team: { color: "#888", fontSize: 13, marginTop: 2 },
  stats: { alignItems: "center" },
  average: { color: "#e05c00", fontSize: 18, fontWeight: "700" },
  averageLabel: { color: "#888", fontSize: 11 },
  separator: { height: 1, backgroundColor: "#2a2a3e", marginHorizontal: 16 },
});
