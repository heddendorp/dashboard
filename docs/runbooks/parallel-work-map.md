# Parallel Work Map

## Baseline Branch
- `codex/stage1-basics`

## Parallel Branches
- `codex/stage2-frog`
- `codex/stage3-data`

## Conflict Avoidance Rules
1. Stage 2 edits only Frog-owned paths.
2. Stage 3 edits only Data/API-owned paths.
3. Shared files (`src/app/app.ts`, `src/app/app.html`, `server/routes.js`) require narrow changes and small PRs.
4. If a shared contract changes, update runbooks in the same PR.

## Shared Contract Files
- `src/app/core/dashboard.models.ts`
- `server/routes.js`

## Merge Strategy
1. Merge smallest contract-only PRs first.
2. Rebase Stage 2 and Stage 3 branches after shared contract changes.
3. Keep feature PRs focused on owned paths.
