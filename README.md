# Hallway Dashboard

Smart always-on hallway dashboard built with Angular 21, signals, Tailwind CSS, and a Vercel backend function for private API access.

## Current Status
- Stage 1 baseline is implemented.
- Frontend layout is ready and split into isolated feature areas.
- Backend API is live with Basic auth, Beat81 events, and Google Calendar reads.
- Stage 2 (frog) and shopping persistence are still planned and documented.

## Architecture
- Frontend: static Angular app.
- Backend: file-based Vercel API routes under `api/`.
- Auth: Basic auth for all `/api/*` routes.
- Data (current): Google Calendar + Beat81 adapters, shopping placeholder.
- Data (planned): shopping persistence via Vercel-managed KV.

## Tech Stack
- Angular 21
- TypeScript (strict)
- Tailwind CSS v4
- Vercel serverless function (Node 22 runtime)

## Repository Structure
```text
src/app/
  core/
    dashboard.models.ts
  features/
    data/
      components/data-column/
      models/
      services/
    frog/
      components/frog-column/
      state/
      assets/
api/
  health.ts
  dashboard.ts
  beat81/events.ts
  beat81/event-types.ts
  shopping/index.ts
  shopping/[id].ts
server/
  auth.ts
  with-auth.ts
  routes.ts
  types.ts
  adapters/
docs/
  implementation-plan.md
  runbooks/
    parallel-work-map.md
    stage-2-frog.md
    stage-3-data-management.md
public/
  frog/
```

## Getting Started
1. Install dependencies:
```bash
npm install
```
2. Start local app + API:
```bash
npm start
```
   This runs `vercel dev --listen 3000` and serves both frontend and API on `http://localhost:3000`.
3. Build production bundle:
```bash
npm run build
```

Optional: Angular-only dev server:
```bash
npm run start:web
```
This uses `proxy.conf.json` so `/api/*` requests are proxied to `http://localhost:3000`.

## Local Environment Configuration
Use a local env file for API configuration:

1. Create your local env file:
```bash
cp .env.example .env.local
```
2. Edit `.env.local` with your values.

Notes:
- `.env.local` is ignored by git.
- `.env.example` is the committed template.
- API handlers load `.env.local` and `.env` locally, but real environment variables still take precedence.
- For local browser testing, set `BASIC_AUTH_DISABLED=true` in `.env.local` if your dev proxy/runtime does not forward `Authorization` headers.

## Run Locally
Use:
```bash
npm start
```

Notes:
- `start` uses `vercel dev --listen 3000`.
- If needed, Angular-only dev mode is `npm run start:web`.
- Vercel CLI auth is required (`npx vercel login`).

## Backend API (Current)
All routes require Basic auth.

### Environment Variables
Required now:
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASS`
- `BASIC_AUTH_DISABLED` (optional local-only override; keep `false` in production)

Available now (Beat81):
- `BEAT81_API_BASE_URL` (optional, default `https://api.production.b81.io`)
- `BEAT81_ACCEPT_LANGUAGE` (optional, default `de`)
- `BEAT81_TOKEN` (optional bearer token; endpoint may work without it depending on Beat81 policy)
- `BEAT81_LOCATION_ID` (location filter for `/api/beat81/events`, defaults to `b5d7aae0-cec0-45bd-a79f-a312635078c1`)
- `BEAT81_DATE_BEGIN_GTE` (optional ISO timestamp filter for `/api/beat81/events`)
- `BEAT81_EVENTS_LIMIT` (optional, default `10`)
- `BEAT81_EVENTS_SKIP` (optional, default `0`)
- `BEAT81_EVENT_TYPES_LIMIT` (optional, default `50`)

Available now (Google Calendar):
- `GOOGLE_SERVICE_ACCOUNT_JSON` (or `GOOGLE_SERVICE_ACCOUNT` for backward compatibility)
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_TIMEZONE` (optional, default `Europe/Berlin`)
- `GOOGLE_CALENDAR_MAX_RESULTS` (optional, default `8`)

Planned for later Stage 3:
- KV credentials from Vercel-managed KV

### Google Calendar Setup (Shared Calendar)
1. Create a Google Cloud service account and enable the Google Calendar API.
2. Share your target Google Calendar with the service-account email (at least "See all event details").
3. Put the full service-account JSON into `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env.local` (single-line JSON string).
4. Set `GOOGLE_CALENDAR_ID` to that shared calendar ID.
5. Start the app with `npm start` and check `GET /api/dashboard` for `calendar` entries.

### Routes
- `GET /api/health`
  - Returns service status payload.
- `GET /api/dashboard`
  - Returns `DashboardPayload` and includes upcoming Beat81 workouts with coach data when available.
- `GET /api/beat81/event-types`
  - Returns normalized Beat81 event types payload.
- `GET /api/beat81/events`
  - Returns normalized Beat81 events payload (title, date, location, trainer name, trainer image URL).
  - Accepts both camelCase and Beat81-native snake_case query keys (for example `locationId` or `location_id`).
- `GET /api/shopping`
  - Returns empty list placeholder.
- `POST /api/shopping`
- `PATCH /api/shopping/:id`
- `DELETE /api/shopping/:id`
  - Currently `501 not_implemented` (reserved for Stage 3).

## UI Component Boundaries
To reduce merge conflicts in parallel work:
- `src/app/features/frog/**` is Stage 2 owned.
- `src/app/features/data/**` is Stage 3 owned.
- `server/adapters/**` is Stage 3 owned.
- Shared files (`src/app/app.ts`, `src/app/app.html`, `server/types.ts`, `server/routes.ts`) should only receive narrow, explicit contract changes.

## Parallel Branch Workflow
Baseline branch:
- `codex/stage1-basics`

Parallel branches:
- `codex/stage2-frog`
- `codex/stage3-data`

Detailed process:
- `docs/runbooks/parallel-work-map.md`

## Planning Docs
- Master plan: `docs/implementation-plan.md`
- Frog runbook: `docs/runbooks/stage-2-frog.md`
- Data runbook: `docs/runbooks/stage-3-data-management.md`
- Parallel merge/conflict rules: `docs/runbooks/parallel-work-map.md`

## Vercel Deployment Notes
- `vercel.json` configures Angular framework deployment.
- Frontend build output is generated under `dist/dashboard/browser`.
- Production currently expects auto-deploy from `main`.

## Development Guidelines
- Prefer Angular CLI generators for new components/services.
- Keep changes scoped to owned feature directories when working in parallel branches.
- Update runbook docs when changing shared contracts.
