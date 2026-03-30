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
| --- | --- |
| Monorepo | Turborepo |
| Language | TypeScript throughout |
| API | Node.js + Express |
| Mobile | React Native + Expo 54 |
| Web | React (planned) |
| Database | PostgreSQL (planned) |
| Auth | OAuth / JWT (planned) |
| Hosting | TBD (Railway / Render / Fly.io) — see issue #14 |

---

## Repo Structure

```text
strikemate/
  apps/
    api/        — Node.js/Express API server (port 3001) — WORKING
    mobile/     — React Native + Expo 54 bowler app — WORKING (proof-of-life screen)
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

| Data | Endpoint |
| --- | --- |
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

### API Route Design

`weekNum` is required for `/standings` and `/bowlers` (it's passed to the LS API).
For `/scores/:weekNumber` and `/matchups/:weekNumber`, the path param is the source of truth — `weekNum` is optional in the query string for those routes.

### Caching

`apps/api` has an in-memory TTL cache (`src/cache.ts`):

- `Cache` class backed by a `Map` with `MAX_SIZE = 500` (oldest-entry eviction)
- In-flight promise coalescing via `getOrFetch()` — prevents cache stampedes
- TTLs: 1 hour for standings/bowlers, 10 minutes for scores/matchups
- Expired entries purged every 5 minutes via `setInterval(...).unref()`
- `X-Cache: HIT / MISS / BYPASS` header on all responses

### Matchup Derivation

Matchups are derived from weekly score data — no dedicated LS endpoint needed. `LaneBowledOn` on each `LSWeekScore` row tells us what lane each bowler bowled on. Teams on the same cross-lane pair (odd + odd+1) played each other. Logic lives in `packages/leaguesecretary-client/src/matchups.ts`.

### Domain Types (`@strikemate/types`)

Branded ID types are used for type safety: `LeagueId`, `TeamId`, `BowlerId`, `WeekId`, `MatchupId`. All are strings at runtime but distinct types at compile time.

`teamName` is denormalized onto both `Bowler` and `TeamStanding` for convenience in list views — avoids a separate team lookup.

### LeagueSecretary Data Quirks

- `BowlerStatus`: `"R"` = regular roster, `"T"` = temporary/sub
- `TeamID: 0` = unrostered sub — filter these out in the mobile app using `teamId !== "0"`
- `ScoreType`: `"S"` = actual score bowled, `"A"` = absent (SeriesTotal will be 0), `"I"` = incomplete, `"0"` = unused game slot
- Names stored as `"LastName, FirstName"` — mapper normalizes to `"FirstName LastName"`
- `HandicapBeforeBowling` is the **per-game** handicap — multiply by 3 for series handicap

### Mobile App

- Expo 54, React Native 0.81, React 19
- Entry point: `apps/mobile/App.tsx` (no Expo Router yet — plain React Native navigation coming in issue #10)
- Environment config via `EXPO_PUBLIC_*` env vars — see `apps/mobile/.env.example`
- On a physical device, `EXPO_PUBLIC_API_BASE` must be your machine's local IP (not localhost)
- Find local IP on Mac: `ipconfig getifaddr en0`

---

## Current State (as of March 30, 2026)

### Done

- [x] Turborepo monorepo scaffolded with npm workspaces
- [x] `@strikemate/types` — full domain model with `teamName` on `Bowler` and `TeamStanding`
- [x] `@strikemate/leaguesecretary-client` — all 3 endpoints confirmed working, matchup derivation added
- [x] `apps/api` — all routes working with caching: `/standings`, `/bowlers`, `/scores/:weekNumber`, `/matchups/:weekNumber`
- [x] `apps/mobile` — Expo 54 scaffold working in Expo Go, proof-of-life screen shows live standings and bowlers
- [x] `apps/mobile/.env.example` — documents `EXPO_PUBLIC_API_BASE` and `EXPO_PUBLIC_LEAGUE_QUERY`
- [x] GitHub repo at `jason-shprintz/strikemate`, PR workflow established with Copilot reviews

### Open Issues (prioritized order)

- **#10** — Proper standings and bowler list screens with pull-to-refresh and sort toggle ← START HERE
- **#11** — Weekly recap screen (depends on matchup derivation — already done in #8)
- **#12** — Matchup Intelligence screen — the killer feature (depends on #11)
- **#14** — Deploy `apps/api` to production hosting (Railway / Render / Fly.io)

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
curl "http://localhost:3001/league/scores/26?leagueId=131919&year=2025&season=f"
curl "http://localhost:3001/league/matchups/26?leagueId=131919&year=2025&season=f"
```

### Mobile app

```bash
cd apps/mobile
cp .env.example .env.local
# Edit .env.local — set EXPO_PUBLIC_API_BASE to your machine's local IP
npx expo start
# Scan QR code with Expo Go
```

---

## Development Conventions

- All PRs branch from latest `master` and target `master`
- Branch naming: `feat/`, `fix/`, `docs/`, `chore/`
- TypeScript strict mode + `noUncheckedIndexedAccess` everywhere
- Raw LS API types live in `ls-types.ts` and never leak into app code — always map through `mapper.ts` first
- Commit messages follow conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- All Markdown files must pass markdownlint: code fences require a language identifier, table cells require spaces around pipes (`| --- |`)
- **Never guess package versions** — always verify against official compatibility tables or use official tooling (e.g. `npx expo install`)
- Copilot reviews all PRs automatically — address comments before merging
