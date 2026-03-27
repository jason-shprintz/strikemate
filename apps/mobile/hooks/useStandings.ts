import type { TeamStanding } from "@strikemate/types";
import { useEffect, useState } from "react";
import { API_BASE_URL, leagueQuery } from "../constants/api";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: TeamStanding[] };

export function useStandings() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`${API_BASE_URL}/league/standings?${leagueQuery()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TeamStanding[]>;
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
