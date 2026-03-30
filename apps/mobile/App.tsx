/**
 * TEMPORARY proof-of-life screen.
 * Fetches live standings and bowler list from the local API and displays them
 * in a scrollable list. Replace with proper navigation screens once routing
 * is set up (issue #10).
 *
 * Requires the API to be running:
 *   cd apps/api && npm run dev
 */

import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Config ──────────────────────────────────────────────────────────────────
// Falls back to local IP if env var is not set.
// Set EXPO_PUBLIC_API_BASE in apps/mobile/.env.local to override.
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "http://192.168.1.4:3001";
const LEAGUE =
  process.env.EXPO_PUBLIC_LEAGUE_QUERY ??
  "leagueId=131919&year=2025&season=f&weekNum=26";

// ─── Types (inline so this file has no external deps) ────────────────────────
interface Standing {
  teamId: string;
  teamName: string;
  rank: number;
  wins: number;
  losses: number;
  totalPoints: number;
}

interface Bowler {
  id: string;
  teamId: string;
  name: string;
  teamName: string;
  currentAverage: number;
}

type Tab = "standings" | "bowlers";
type Status = "loading" | "idle" | "error";

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>("standings");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [bowlers, setBowlers] = useState<Bowler[]>([]);
  // Initialize to 'loading' so we never flash an empty list on first render
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const url =
      tab === "standings"
        ? `${API_BASE}/league/standings?${LEAGUE}`
        : `${API_BASE}/league/bowlers?${LEAGUE}`;

    setStatus("loading");
    setError("");

    // AbortController cancels stale fetches when the tab changes before the
    // previous request completes, preventing out-of-order state updates.
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          // Try to surface the API's JSON error message if available
          let message = `HTTP ${r.status}`;
          try {
            const body = (await r.json()) as { error?: string };
            if (typeof body.error === "string") message = body.error;
          } catch {
            // Ignore JSON parse errors and fall back to status code message
          }
          throw new Error(message);
        }
        return r.json();
      })
      .then((data) => {
        if (tab === "standings") {
          setStandings(data as Standing[]);
        } else {
          // Filter out unrostered subs — teamId "0" means no team assigned
          setBowlers((data as Bowler[]).filter((b) => b.teamId !== "0"));
        }
        setStatus("idle");
      })
      .catch((e: unknown) => {
        // Ignore AbortError — it's an intentional cancellation, not a failure
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("error");
      });

    return () => controller.abort();
  }, [tab]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ StrikeMate</Text>
        <Text style={styles.headerSub}>Sunday Fun Winter 25-26</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "standings" && styles.tabActive]}
          onPress={() => setTab("standings")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "standings" && styles.tabTextActive,
            ]}
          >
            Standings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "bowlers" && styles.tabActive]}
          onPress={() => setTab("bowlers")}
        >
          <Text
            style={[styles.tabText, tab === "bowlers" && styles.tabTextActive]}
          >
            Bowlers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {status === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e05c00" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {status === "error" && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Text style={styles.errorHint}>
            Is the API running at {API_BASE}?
          </Text>
        </View>
      )}

      {status === "idle" && tab === "standings" && (
        <FlatList
          data={standings}
          keyExtractor={(item) => item.teamId}
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
      )}

      {status === "idle" && tab === "bowlers" && (
        <FlatList
          data={bowlers}
          keyExtractor={(item) => item.id}
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
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const BG = "#1a1a2e";
const SURFACE = "#16213e";
const ACCENT = "#e05c00";
const TEXT = "#ffffff";
const MUTED = "#8888aa";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: SURFACE,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff15",
  },
  headerTitle: { color: TEXT, fontSize: 22, fontWeight: "700" },
  headerSub: { color: MUTED, fontSize: 13, marginTop: 2 },

  tabs: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff15",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: ACCENT },
  tabText: { color: MUTED, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: ACCENT },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  loadingText: { color: MUTED, marginTop: 8 },
  errorText: { color: "#ff6b6b", fontSize: 16, fontWeight: "600" },
  errorDetail: { color: MUTED, fontSize: 13 },
  errorHint: { color: MUTED, fontSize: 12, marginTop: 4 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
  },
  rowBody: { flex: 1 },
  rowTitle: { color: TEXT, fontSize: 15, fontWeight: "600" },
  rowSub: { color: MUTED, fontSize: 13, marginTop: 2 },
  rank: { color: ACCENT, fontWeight: "700", fontSize: 16, width: 36 },
  avg: { color: ACCENT, fontSize: 20, fontWeight: "700" },
  sep: { height: 1, backgroundColor: "#ffffff10", marginHorizontal: 16 },
});
