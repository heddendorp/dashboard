# Hallway Dashboard

Smart always-on hallway dashboard built with Angular 21, signals, Tailwind CSS, and a Vercel backend function for private API access.

## Current Status
- Stage 1 baseline is implemented.
- Frontend layout is ready and split into isolated feature areas.
- Backend API skeleton exists with auth + placeholder data contracts.
- Stage 2 (frog) and Stage 3 (data management) are planned and documented.

## Architecture
- Frontend: static Angular app.
- Backend: single Vercel function at `api/[[...route]].ts`.
- Auth: Basic auth for all `/api/*` routes.
- Data (current): placeholder responses.
- Data (planned): Google Calendar, Beat81 adapter, shopping persistence via Vercel-managed KV.

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
  [[...route]].ts
  auth.ts
  routes.ts
  types.ts
  adapters/
  contracts/
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
2. Start frontend dev server:
```bash
npm start
```
3. Build production bundle:
```bash
npm run build
```

## Backend API (Current)
All routes require Basic auth.

### Environment Variables
Required now:
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASS`

Planned for Stage 3:
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_CALENDAR_ID`
- KV credentials from Vercel-managed KV
- Beat81 adapter credentials/settings

### Routes
- `GET /api/health`
  - Returns service status payload.
- `GET /api/dashboard`
  - Returns placeholder `DashboardPayload` with widget health.
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
- `api/adapters/**` and `api/contracts/**` are Stage 3 owned.
- Shared files (`src/app/app.ts`, `src/app/app.html`, `api/types.ts`, `api/routes.ts`) should only receive narrow, explicit contract changes.

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
- `vercel.json` configures Angular framework deployment and Node 22 runtime for `api/[[...route]].ts`.
- Frontend build output is generated under `dist/dashboard/browser`.
- Production currently expects auto-deploy from `main`.

## Development Guidelines
- Prefer Angular CLI generators for new components/services.
- Keep changes scoped to owned feature directories when working in parallel branches.
- Update runbook docs when changing shared contracts.
