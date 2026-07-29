# AGENTS.md

This project is a synthetic-data-only proof of concept for converting otology operative notes into surgeon-reviewed patient education diagrams.

Non-negotiables:
- Do not add real patient data.
- Do not log note text.
- Do not build free-form AI image generation.
- Use structured extraction -> Zod validation -> deterministic SVG rendering.
- Missing details must be `not_documented`, never inferred normal.
- Every extracted finding needs source evidence when possible.
- Use mock/rules providers first; external model providers are optional.
- Keep the app usable with zero paid API calls.

Run before committing:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm e2e` if browser workflows changed
