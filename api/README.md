# API Workspace Boundary

This backend folder is shared by both Stage 2 and Stage 3, but ownership is split:

- Stage 2 (`codex/stage2-frog`): no changes expected by default.
- Stage 3 (`codex/stage3-data`): owns `server/adapters/*` and route/data contract expansion.

Keep Stage 2 changes out of API files unless strictly necessary.
