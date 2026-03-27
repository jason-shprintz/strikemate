import { useStandings } from "../../hooks/useStandings";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

export default function StandingsScreen() {
  const state = useStandings();

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
        <Text style={styles.error}>Failed to load standings</Text>
        <Text style={styles.errorDetail}>{state.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={state.data}
      keyExtractor={(item) => item.teamId}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.rank}>#{item.rank}</Text>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName} numberOfLines={1}>{item.teamId}</Text>
            <Text style={styles.record}>{item.wins}W – {item.losses}L</Text>
          </View>
          <Text style={styles.points}>{item.totalPoints} pts</Text>
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
  rank: { color: "#e05c00", fontWeight: "700", fontSize: 16, width: 32 },
  teamInfo: { flex: 1, marginHorizontal: 12 },
  teamName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  record: { color: "#888", fontSize: 13, marginTop: 2 },
  points: { color: "#fff", fontSize: 14, fontWeight: "500" },
  separator: { height: 1, backgroundColor: "#2a2a3e", marginHorizontal: 16 },
});
