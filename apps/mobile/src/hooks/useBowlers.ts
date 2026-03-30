import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, LEAGUE_QUERY } from "../config";

export interface Bowler {
  id: string;
  teamId: string;
  name: string;
  teamName: string;
  currentAverage: number;
}

export type FetchStatus = "loading" | "idle" | "error";
export type BowlerSort = "name" | "average";

export interface UseBowlersResult {
  bowlers: Bowler[];
  status: FetchStatus;
  error: string;
  sort: BowlerSort;
  setSort: (sort: BowlerSort) => void;
  refresh: () => void;
}

export function useBowlers(): UseBowlersResult {
  const [allBowlers, setAllBowlers] = useState<Bowler[]>([]);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<BowlerSort>("name");
  // Incrementing this triggers a re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const url = `${API_BASE}/league/bowlers?${LEAGUE_QUERY}`;
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
        return r.json() as Promise<Bowler[]>;
      })
      .then((data) => {
        // Filter out unrostered subs — teamId "0" means no team assigned
        const rostered = data.filter((b) => b.teamId !== "0");
        setAllBowlers(rostered);
        setStatus("idle");
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("error");
      });

    return () => controller.abort();
  }, [refreshKey]);

  const bowlers = useMemo(
    () =>
      [...allBowlers].sort((a, b) => {
        if (sort === "average") return b.currentAverage - a.currentAverage;
        return a.name.localeCompare(b.name);
      }),
    [allBowlers, sort],
  );

  return { bowlers, status, error, sort, setSort, refresh };
}
