# StrikeMate

A modern bowling league management platform — a cross-platform replacement for BLS and the LeagueSecretary companion app.

## Monorepo Structure

```text
strikemate/
  apps/
    api/        — Node.js/Express API server
    mobile/     — React Native bowler app
    web/        — React web app (not yet started)
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

All data routes require these query params:

| Param | Description | Example |
| --- | --- | --- |
| `leagueId` | Numeric league ID | `131919` |
| `year` | Season start year | `2025` |
| `season` | `f` (fall/winter) or `s` (spring/summer) | `f` |
| `weekNum` | Current/latest week number (required for standings/bowlers, optional for `:weekNumber` routes) | `26` |

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `GET` | `/league/standings` | Team standings |
| `GET` | `/league/bowlers` | Full bowler list |
| `GET` | `/league/scores/:weekNumber` | Bowler series for a given week |
| `GET` | `/league/matchups/:weekNumber` | Derived matchups for a given week |

### Example — Sun Coast Sunday Fun Winter 25-26

```bash
BASE="leagueId=131919&year=2025&season=f&weekNum=26"

curl "http://localhost:3001/league/standings?$BASE"
curl "http://localhost:3001/league/bowlers?$BASE"
curl "http://localhost:3001/league/scores/26?leagueId=131919&year=2025&season=f"
curl "http://localhost:3001/league/matchups/26?leagueId=131919&year=2025&season=f"
```

## Running the Mobile App

### 1. Set up your environment file

```bash
cd apps/mobile
cp .env.example .env.local
```

Edit `.env.local` and set `EXPO_PUBLIC_API_BASE` to your machine's local IP so
Expo Go on your phone can reach the API over WiFi:

```bash
# Find your local IP on Mac:
ipconfig getifaddr en0

# Find your local IP on Windows:
ipconfig  # look for IPv4 Address
```

Example `.env.local`:

```dotenv
EXPO_PUBLIC_API_BASE=http://192.168.1.4:3001
EXPO_PUBLIC_LEAGUE_QUERY=leagueId=131919&year=2025&season=f&weekNum=26
```

### 2. Start the API (in a separate terminal)

```bash
cd apps/api && npm run dev
```

### 3. Start Expo

```bash
cd apps/mobile
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone. Both should be on the same WiFi network.

## Deploying the API

The `apps/api` service can be deployed to any Node.js hosting provider.
Railway is the recommended option — it has a free tier and supports
npm workspace monorepos natively.

### Railway (recommended)

1. Create a free account at <https://railway.app> and install the CLI:

   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. From the repo root, create a new project and link it:

   ```bash
   railway init         # creates a new project
   railway link         # links this directory to the project
   ```

3. Set the root directory, build command, and start command in the Railway
   dashboard (or via `railway.toml` — see below):

   | Setting | Value |
   | --- | --- |
   | Root directory | `/` (repo root) |
   | Build command | *(leave empty — `tsx` runs TypeScript directly at startup, no compilation step needed)* |
   | Start command | `npm start -w @strikemate/api` |

4. Deploy:

   ```bash
   railway up
   ```

5. Copy the public URL that Railway assigns (e.g.
   `https://strikemate-api-production.up.railway.app`) and paste it into
   `apps/mobile/.env.local` as `EXPO_PUBLIC_API_BASE`.

### Render / Fly.io

The repo includes a `Dockerfile` at `apps/api/Dockerfile` that works with any
container-based provider (Render, Fly.io, etc.).

**Render**

1. Create a new **Web Service** in the Render dashboard.
2. Point it at this repository and set:

   | Setting | Value |
   | --- | --- |
   | Root directory | *(repo root)* |
   | Dockerfile path | `apps/api/Dockerfile` |
   | Port | `3001` |

**Fly.io**

```bash
cd apps/api
fly launch --dockerfile Dockerfile   # answer prompts, pick region
fly deploy
```

**Docker (local test before deploy)**

```bash
# Build from the repo root (required for workspace COPY steps)
docker build -f apps/api/Dockerfile -t strikemate-api .

docker run -p 3001:3001 strikemate-api
curl http://localhost:3001/health   # should return {"status":"ok"}
```

### Pointing the mobile app at the production API

After deploying, edit `apps/mobile/.env.local` and update `EXPO_PUBLIC_API_BASE`:

```dotenv
EXPO_PUBLIC_API_BASE=https://<your-deployed-url>
```

## Useful Commands

| Command | From | Description |
| --- | --- | --- |
| `npm install` | root | Install all workspace dependencies |
| `npm run dev` | root | Start all apps in dev mode (via Turbo) |
| `npm run build` | root | Build all packages and apps |
| `npm run typecheck` | root | TypeScript checks across the monorepo |
| `npm run dev` | `apps/api` | Start the API server only |
| `npx expo start` | `apps/mobile` | Start the mobile app |

## Packages

### `@strikemate/types`

Shared TypeScript domain types used across all apps and packages. Source of truth for the data model — `League`, `Team`, `Bowler`, `Week`, `Series`, `Matchup`, etc.

### `@strikemate/leaguesecretary-client`

Typed HTTP client for the LeagueSecretary.com API. All endpoints are confirmed POST requests to Kendo UI `_Read` actions:

| Function | Endpoint |
| --- | --- |
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
| --- | --- |
| Monorepo | Turborepo |
| Language | TypeScript |
| API | Node.js + Express |
| Mobile | React Native + Expo |
| Web | React (planned) |
| Database | PostgreSQL (planned) |
