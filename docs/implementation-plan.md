# Hallway Dashboard Implementation Plan

## Summary
Build a touch-first smart hallway dashboard using Angular 21 + signals + Tailwind, deployed on Vercel.

Architecture baseline:
- Static Angular frontend (no Angular SSR runtime in V1)
- Single Vercel BFF function for private APIs (`/api/*`)
- Basic auth/passcode gate for API access
- Vercel-managed KV (Upstash via Marketplace) in later stage

## Stage 1: Absolute Basics

### Goal
Create the baseline that allows parallel implementation work for Frog and Data Management.

### Deliverables
- Replace starter template with dashboard shell layout.
- Reserve right third of screen for frog panel placeholder.
- Keep left area as calendar/shopping/workout widget placeholders.
- Add Vercel BFF skeleton with typed contracts and health/dashboard endpoints.
- Add basic auth middleware for backend routes.
- Add Vercel routing config for one backend entrypoint.

### Verification
- `npm run build` succeeds.
- Dashboard shell renders without runtime errors.
- `GET /api/health` and `GET /api/dashboard` return JSON behind auth.

## Stage 2: Frog

### Goal
Implement interactive frog panel from provided SVG sprite assets.

### Scope
- Frog state machine (`idle`, `blink`, `wave`, `happy`, `sleep`).
- Touch-first interactions (tap required, hover optional).
- Accessibility-safe interactions and reduced-motion handling.

### Verification
- Tap interactions trigger predictable frog states.
- Frog panel failures do not break other widgets.

## Stage 3: Data Management

### Goal
Implement real data pipelines and persistence.

### Scope
- Google Calendar via service account + shared calendar.
- Beat81 private adapter from recorded browser requests.
- Shopping list persistence in Vercel-managed KV.
- Widget health, cache TTL, and graceful degradation.

### Verification
- Calendar/Beat81 failures degrade only affected widgets.
- Shopping list persists across reload/device sessions.
- Dashboard endpoint returns partial data + health flags when needed.

## Branch Workflow
1. Implement Stage 1 on `codex/stage1-basics`.
2. Create `codex/stage2-frog` from the Stage 1 baseline.
3. Create `codex/stage3-data` from the same Stage 1 baseline.

This keeps Stage 2 and Stage 3 independent and parallelizable.
