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
    console.log("[useBowlers] fetching:", url);
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
      .then((data: Array<Record<string, unknown>>) => {
        console.log("[useBowlers] raw count:", data.length, "sample:", data[0]);
        const rostered = data
          .filter((b) => {
            const teamId = b.teamId ?? b.TeamID;
            const name = b.name ?? b.BowlerName;
            return String(teamId) !== "0" && name != null;
          })
          .map((b) => {
            const rawName = String(b.name ?? b.BowlerName ?? "");
            // Normalize "LastName, FirstName" → "FirstName LastName" if not already mapped
            const name =
              !b.name && rawName.includes(", ")
                ? rawName.replace(/^(.+),\s*(.+)$/, "$2 $1")
                : rawName;
            return {
              id: String(b.id ?? b.BowlerID),
              teamId: String(b.teamId ?? b.TeamID),
              name,
              teamName: String(b.teamName ?? b.TeamName ?? ""),
              currentAverage: Number(b.currentAverage ?? b.Average ?? 0),
            } as Bowler;
          });
        console.log("[useBowlers] rostered count:", rostered.length);
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
        return (a.name ?? "").localeCompare(b.name ?? "");
      }),
    [allBowlers, sort],
  );

  return { bowlers, status, error, sort, setSort, refresh };
}
