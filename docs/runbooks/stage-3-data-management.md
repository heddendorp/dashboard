# Stage 3 Runbook: Data Management

Branch: `codex/stage3-data`

## Scope
- Implement private API integrations and durable data handling.
- Connect Google Calendar, shopping persistence, and Beat81 adapter.
- Keep frog feature files untouched unless a shared type is required.

## File Ownership
- `server/adapters/calendar/`
- `server/adapters/shopping/`
- `server/adapters/beat81/`
- `api/contracts/`
- `api/health.js`
- `api/dashboard.js`
- `api/beat81/`
- `api/shopping/`
- `server/routes.js`
- `src/app/features/data/components/`
- `src/app/features/data/models/`
- `src/app/features/data/services/`

## Planned Work
1. Implement adapter interfaces and provider-specific modules.
2. Add auth-safe config loading via environment variables.
3. Implement cache and health-state reporting.
4. Add shopping read/write persistence in Vercel-managed KV.
5. Wire frontend data services to backend contracts.

## Acceptance
- Data widgets render real payloads and recover gracefully from adapter errors.
- Shopping data persists across reloads.
- No Stage 2 frog files modified without explicit need.
