import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { type BowlerSort, useBowlers } from "../hooks/useBowlers";
import { colors } from "../theme";

export function BowlersScreen() {
  const { bowlers, status, error, sort, setSort, refresh } = useBowlers();

  if (status === "loading" && bowlers.length === 0) {
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
    <>
      {/* Sort toggle */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {(["name", "average"] as BowlerSort[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.sortBtn, sort === option && styles.sortBtnActive]}
            onPress={() => setSort(option)}
          >
            <Text
              style={[
                styles.sortBtnText,
                sort === option && styles.sortBtnTextActive,
              ]}
            >
              {option === "name" ? "Name" : "Average"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={bowlers}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={status === "loading"}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>{item.teamName}</Text>
            </View>
            <Text style={styles.avg}>{item.currentAverage}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </>
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

  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortLabel: { color: colors.muted, fontSize: 13 },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  sortBtnActive: { borderColor: colors.accent, backgroundColor: "#e05c0020" },
  sortBtnText: { color: colors.muted, fontSize: 13 },
  sortBtnTextActive: { color: colors.accent },

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
  avg: { color: colors.accent, fontSize: 20, fontWeight: "700" },
  sep: { height: 1, backgroundColor: colors.separator, marginHorizontal: 16 },
});
