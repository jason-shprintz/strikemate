import { useCallback, useEffect, useState } from "react";
import { API_BASE, LEAGUE_QUERY } from "../config";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface MatchupTeam {
  id: string;
  name: string;
}

export interface MatchupBowler {
  id: string;
  name: string;
  teamId: string;
  currentAverage?: number;
  enteringAverage?: number;
  totalPins: number;
  totalGames: number;
}

export interface HeadToHeadRecord {
  teamAId: string;
  teamBId: string;
  teamAWins: number;
  teamBWins: number;
  meetings: Array<{
    weekId: string;
    teamAPoints: number;
    teamBPoints: number;
  }>;
}

export interface MatchupPreviewData {
  matchup: {
    id: string;
    lanes: [number, number];
    homeTeamId: string;
    awayTeamId: string;
  };
  homeTeam: MatchupTeam;
  awayTeam: MatchupTeam;
  homeBowlers: MatchupBowler[];
  awayBowlers: MatchupBowler[];
  headToHead: HeadToHeadRecord;
  recentForm: {
    homeTeamPoints: number[];
    awayTeamPoints: number[];
  };
}

export type FetchStatus = "loading" | "idle" | "error";

export interface UseMatchupPreviewResult {
  preview: MatchupPreviewData | null;
  status: FetchStatus;
  error: string;
  refresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMatchupPreview(teamId: string, weekNum: number): UseMatchupPreviewResult {
  const [preview, setPreview] = useState<MatchupPreviewData | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!teamId) {
      setStatus("idle");
      setPreview(null);
      return;
    }

    setStatus("loading");
    setError("");

    const controller = new AbortController();

    const params = new URLSearchParams(LEAGUE_QUERY);
    params.set("weekNum", String(weekNum));
    params.set("teamId", teamId);
    const url = `${API_BASE}/league/matchup-preview?${params.toString()}`;

    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          let message = `HTTP ${r.status}`;
          try {
            const body = (await r.json()) as { error?: string };
            if (typeof body.error === "string") message = body.error;
          } catch {
            // Ignore JSON parse errors
          }
          throw new Error(message);
        }
        return r.json() as Promise<MatchupPreviewData>;
      })
      .then((data) => {
        setPreview(data);
        setStatus("idle");
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("error");
      });

    return () => controller.abort();
  }, [teamId, weekNum, refreshKey]);

  return { preview, status, error, refresh };
}
