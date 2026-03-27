# StrikeMate

A modern bowling league management platform — a cross-platform replacement for BLS and the LeagueSecretary companion app.

## Monorepo Structure

```
strikemate/
  apps/
    api/        — Node.js/Express API server
    mobile/     — React Native bowler app (coming soon)
    web/        — React web app (coming soon)
  packages/
    types/                    — Shared TypeScript domain types
    leaguesecretary-client/   — Typed HTTP client for LeagueSecretary.com API
```

## Prerequisites

- Node.js 20+
- npm 10+

## Getting Started

Install all dependencies from the repo root:

```bash
npm install
```

## Running the API

```bash
cd apps/api
npm run dev
```

The API will start at `http://localhost:3001`.

### API Routes

All data routes require four query params that identify the league:

| Param | Description | Example |
|-------|-------------|---------|
| `leagueId` | Numeric league ID | `131919` |
| `year` | Season start year | `2025` |
| `season` | `f` (fall/winter) or `s` (spring/summer) | `f` |
| `weekNum` | Current/latest week number | `26` |

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Health check |
| `GET` | `/league/standings` | Team standings |
| `GET` | `/league/bowlers` | Full bowler list |
| `GET` | `/league/scores/:weekNumber` | Bowler series for a given week |

### Example — Sun Coast Sunday Fun Winter 25-26

```bash
BASE="leagueId=131919&year=2025&season=f&weekNum=26"

curl "http://localhost:3001/league/standings?$BASE"
curl "http://localhost:3001/league/bowlers?$BASE"
curl "http://localhost:3001/league/scores/26?$BASE"
```

## Useful Commands

| Command | From | Description |
| ------- | ---- | ----------- |
| `npm install` | root | Install all workspace dependencies |
| `npm run dev` | root | Start all apps in dev mode (via Turbo) |
| `npm run build` | root | Build all packages and apps |
| `npm run typecheck` | root | TypeScript checks across the monorepo |
| `npm run dev` | `apps/api` | Start the API server only |

## Packages

### `@strikemate/types`

Shared TypeScript domain types used across all apps and packages. Source of truth for the data model — `League`, `Team`, `Bowler`, `Week`, `Series`, `Matchup`, etc.

### `@strikemate/leaguesecretary-client`

Typed HTTP client for the LeagueSecretary.com API. All endpoints are confirmed POST requests to Kendo UI `_Read` actions:

| Function | Endpoint |
|----------|----------|
| `fetchStandings` | `POST /League/InteractiveStandings_Read` |
| `fetchBowlerList` | `POST /Bowler/BowlerByWeekList_Read` |
| `fetchWeekScores` | `POST /League/Summary_Read` |

```ts
import { fetchStandings, fetchBowlerList, fetchWeekScores } from '@strikemate/leaguesecretary-client';

const ref = { leagueId: 131919, year: 2025, season: 'f', weekNum: 26 };

const standings = await fetchStandings(ref);
const bowlers   = await fetchBowlerList(ref);
const scores    = await fetchWeekScores(ref, 26);
```

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Monorepo | Turborepo |
| Language | TypeScript |
| API | Node.js + Express |
| Mobile | React Native (planned) |
| Web | React (planned) |
| Database | PostgreSQL (planned) |
