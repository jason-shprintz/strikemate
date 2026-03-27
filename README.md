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

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/league/:leagueId/standings` | Team standings |
| `GET` | `/league/:leagueId/bowlers` | Full bowler list |
| `GET` | `/league/:leagueId/scores/:weekNumber` | Bowler series for a given week |

### Example — your league (ID: 131919)

```bash
curl http://localhost:3001/league/131919/standings
curl http://localhost:3001/league/131919/bowlers
curl http://localhost:3001/league/131919/scores/1
```

## Useful Commands

| Command | From | Description |
|---------|------|-------------|
| `npm install` | root | Install all workspace dependencies |
| `npm run dev` | root | Start all apps in dev mode (via Turbo) |
| `npm run build` | root | Build all packages and apps |
| `npm run typecheck` | root | TypeScript checks across the monorepo |
| `npm run dev` | `apps/api` | Start the API server only |

## Packages

### `@strikemate/types`

Shared TypeScript domain types used across all apps and packages. Source of truth for the data model — `League`, `Team`, `Bowler`, `Week`, `Series`, `Matchup`, etc.

### `@strikemate/leaguesecretary-client`

Typed HTTP client for the LeagueSecretary.com API. Handles fetching and mapping raw LS responses to `@strikemate/types` domain objects.

```ts
import { fetchStandings, fetchBowlerList, fetchWeekScores } from '@strikemate/leaguesecretary-client';

const standings = await fetchStandings(131919);
const bowlers   = await fetchBowlerList(131919);
const scores    = await fetchWeekScores(131919, 1);
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo |
| Language | TypeScript |
| API | Node.js + Express |
| Mobile | React Native (planned) |
| Web | React (planned) |
| Database | PostgreSQL (planned) |
