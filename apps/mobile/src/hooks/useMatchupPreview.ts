import { useCallback, useEffect, useState } from "react";
import type { Bowler, HeadToHeadRecord, MatchupPreview, Team } from "@strikemate/types";
import { API_BASE, LEAGUE_QUERY } from "../config";

// ─── Re-exports for screen consumption ───────────────────────────────────────

export type MatchupPreviewData = MatchupPreview;
export type MatchupBowler = Bowler;
export type MatchupTeam = Team;
export type { HeadToHeadRecord };

// ─── Status / result ─────────────────────────────────────────────────────────

export type FetchStatus = "loading" | "idle" | "error" | "not-found";

export interface UseMatchupPreviewResult {
  preview: MatchupPreviewData | null;
  status: FetchStatus;
  error: string;
  refresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMatchupPreview(
  teamId: string,
  weekNum: number,
): UseMatchupPreviewResult {
  const [preview, setPreview] = useState<MatchupPreviewData | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Clear stale preview when the query changes (teamId or weekNum) so the
  // full-screen spinner is shown. Pull-to-refresh (refreshKey increment only)
  // intentionally preserves existing preview so the RefreshControl spinner
  // appears over existing content — matching the pattern in useWeekScores.
  useEffect(() => {
    setPreview(null);
  }, [teamId, weekNum]);

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
          throw Object.assign(new Error(message), { status: r.status });
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
        setStatus(
          (e as { status?: number }).status === 404 ? "not-found" : "error",
        );
      });

    return () => controller.abort();
  }, [teamId, weekNum, refreshKey]);

  return { preview, status, error, refresh };
}
