import { useCallback, useEffect, useState } from "react";
import { API_BASE, LEAGUE_QUERY } from "../config";

export interface Standing {
  teamId: string;
  teamName: string;
  rank: number;
  wins: number;
  losses: number;
  totalPoints: number;
}

export type FetchStatus = "loading" | "idle" | "error";

export interface UseStandingsResult {
  standings: Standing[];
  status: FetchStatus;
  error: string;
  refresh: () => void;
}

export function useStandings(): UseStandingsResult {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [error, setError] = useState("");
  // Incrementing this triggers a re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const url = `${API_BASE}/league/standings?${LEAGUE_QUERY}`;
    setStatus("loading");
    setError("");

    const controller = new AbortController();

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
        return r.json() as Promise<Standing[]>;
      })
      .then((data) => {
        // Sort ascending by rank
        const sorted = [...data].sort((a, b) => a.rank - b.rank);
        setStandings(sorted);
        setStatus("idle");
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("error");
      });

    return () => controller.abort();
  }, [refreshKey]);

  return { standings, status, error, refresh };
}
