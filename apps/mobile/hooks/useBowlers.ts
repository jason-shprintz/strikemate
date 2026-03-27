import type { Bowler } from "@strikemate/types";
import { useEffect, useState } from "react";
import { API_BASE_URL, leagueQuery } from "../constants/api";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: Bowler[] };

export function useBowlers() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`${API_BASE_URL}/league/bowlers?${leagueQuery()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Bowler[]>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
