# StrikeMate — Project Context

This file exists to give an AI assistant or new developer full context on the project without needing prior conversation history. Keep it up to date as the project evolves.

---

## What Is StrikeMate?

A modern, cross-platform bowling league management platform. It is a direct replacement for two aging products:

- **BLS (Bowling League Secretary)** by CDE Software — a Windows-only desktop app for league secretaries to enter scores and manage leagues (~$225/year, no cloud, no mobile)
- **LeagueSecretary.com companion app** — the bowler-facing mobile app with poor UX and minimal features (~$9.99/year)

The market has 29,000+ USBC-certified leagues and 1M+ bowlers in the US, with virtually no modern competition.

---

## Product Strategy

### Phase 1 — Bowler App (current focus)

Read data from existing LeagueSecretary.com leagues. Build the bowler experience first — zero secretary friction required.

- Standings, recaps, bowler averages, team stats
- **Matchup Intelligence** (key differentiator): upcoming opponent preview, head-to-head history, "what do I need to bowl to raise my average?" calculator
- Push notifications when scores are uploaded
- Free tier + $0.99/month premium

### Phase 2 — Secretary Score Entry

Let secretaries enter scores directly into StrikeMate. Eliminate the LeagueSecretary.com dependency.

### Phase 3 — Full BLS Replacement

Complete handicap rules engine, finances, USBC sanctioning compliance, BLS data migration.

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Monorepo | Turborepo |
| Language | TypeScript throughout |
| API | Node.js + Express |
| Mobile | React Native + Expo (see notes below) |
| Web | React (planned) |
| Database | PostgreSQL (planned) |
| Auth | OAuth / JWT (planned) |
| Hosting | TBD (Railway / Render / Fly.io) |

---

## Repo Structure

```bash
strikemate/
  apps/
    api/        — Node.js/Express API server (port 3001) — WORKING
    mobile/     — React Native bowler app — IN PROGRESS (see issue #6)
    web/        — React web app (not yet started)
  packages/
    types/                    — Shared TypeScript domain types
    leaguesecretary-client/   — HTTP client for LeagueSecretary.com API
```

---

## Key Technical Decisions

### LeagueSecretary.com API

The site is client-side rendered. Data comes from internal Kendo UI `_Read` endpoints — all are **POST requests with `application/x-www-form-urlencoded` body**. Simple GET requests return an HTML shell with no data.

Standard Kendo pagination params always required in the body: `sort`, `page` (use 1000), `pageSize`, `group`, `filter`

League is identified by four params: `leagueId`, `year`, `season` (`f`=fall/winter, `s`=spring/summer), `weekNum`

**Confirmed endpoints (verified from DevTools network tab):**

| Data | Method + Endpoint |
| ---- | ----------------- |
| Standings | `POST /League/InteractiveStandings_Read` |
| Bowler list | `POST /Bowler/BowlerByWeekList_Read` |
| Weekly scores | `POST /League/Summary_Read` |

**Pilot league (for development/testing):**

- Name: Sunday Fun Winter 25-26
- Center: Sun Coast Hotel & Casino, Las Vegas NV
- `leagueId`: `131919`
- `year`: `2025`
- `season`: `f`
- `weekNum`: `26` (as of March 2026)

### Domain Types (`@strikemate/types`)

Branded ID types are used for type safety: `LeagueId`, `TeamId`, `BowlerId`, `WeekId`, `MatchupId`. All are strings at runtime but distinct types at compile time.

### LeagueSecretary Data Quirks

- `BowlerStatus`: `"R"` = regular roster, `"T"` = temporary/sub
- `TeamID: 0` = unrostered sub — filter these out in the mobile app
- `ScoreType`: `"S"` = actual score bowled, `"A"` = absent (SeriesTotal will be 0), `"I"` = incomplete, `"0"` = unused game slot
- Names stored as `"LastName, FirstName"` — mapper normalizes to `"FirstName LastName"`
- `HandicapBeforeBowling` is the **per-game** handicap — multiply by 3 for series handicap
- `LaneBowledOn` can be used to reconstruct matchups: teams on the same cross-lane pair played each other that week

---

## Current State (as of March 27, 2026)

### Done

- [x] Turborepo monorepo scaffolded with npm workspaces
- [x] `@strikemate/types` — full domain model (League, Team, Bowler, Week, Series, Matchup, TeamStanding, HeadToHeadRecord, MatchupPreview)
- [x] `@strikemate/leaguesecretary-client` — confirmed working against live league data (all 3 endpoints verified)
- [x] `apps/api` — Express server, all three routes returning live data confirmed working
- [x] GitHub repo at jason-shprintz/strikemate, PR workflow established

### Open PRs

- **PR #5** (`feat/mobile-scaffold`) — **DO NOT MERGE** — broken due to incorrect Expo/React Native package versions. See issue #6 for the correct path forward.

### Open Issues (prioritized order)

- **#6** — Re-scaffold mobile from clean Expo 54 baseline using `create-expo-app` ← START HERE
- **#7** — Add `teamName` to domain types and mapper (quick backend fix, unblocks screens)
- **#13** — Document and formalize `EXPO_PUBLIC_API_URL` env var
- **#10** — Standings and bowler list screens (depends on #6 and #7)
- **#8** — Derive matchups from weekly scores via `LaneBowledOn` grouping
- **#9** — Add in-memory caching to apps/api
- **#11** — Weekly recap screen (depends on #8)
- **#12** — Matchup Intelligence screen — the killer feature (depends on #8 and #11)
- **#14** — Deploy apps/api to production hosting

---

## Running Locally

```bash
# From repo root
npm install

# Start the API
cd apps/api
npm run dev
# API at http://localhost:3001

# Test with pilot league
BASE="leagueId=131919&year=2025&season=f&weekNum=26"
curl "http://localhost:3001/league/standings?$BASE"
curl "http://localhost:3001/league/bowlers?$BASE"
curl "http://localhost:3001/league/scores/26?$BASE"
```

### Mobile app (once issue #6 is resolved)

```bash
cd apps/mobile
npm install
# On physical device, set your machine's local IP:
EXPO_PUBLIC_API_URL=http://<your-ip>:3001 npx expo start
# Find your IP on Mac: ipconfig getifaddr en0
```

---

## Development Conventions

- All PRs target `master`
- Branch naming: `feat/`, `fix/`, `docs/`, `chore/`
- TypeScript strict mode + `noUncheckedIndexedAccess` everywhere
- Raw LS API types live in `ls-types.ts` and never leak into app code — always map through `mapper.ts` first
- Commit messages follow conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Never guess package versions** — always use official tooling (e.g. `npx expo install`) or verify against official compatibility tables before writing dependency versions
