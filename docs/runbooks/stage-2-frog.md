# Stage 2 Runbook: Frog Interaction

Branch: `codex/stage2-frog`

## Scope
- Build the interactive frog experience in the right third panel.
- Use provided SVG sprite assets and touch-first interactions.
- Keep data widgets untouched unless a shared interface requires it.

## File Ownership
- `src/app/features/frog/components/`
- `src/app/features/frog/state/`
- `src/app/features/frog/assets/`
- `public/frog/` (if static asset fallback is needed)

## Planned Work
1. Add frog state model (`idle`, `blink`, `wave`, `happy`, `sleep`).
2. Implement signal-based state transitions and timers.
3. Add tap interactions and optional hover response.
4. Add reduced-motion behavior and accessibility labels.
5. Keep `app` shell contract stable.

## Acceptance
- Frog interactions work on touch.
- Frog failures never break dashboard layout.
- No Stage 3 data files modified without explicit need.
