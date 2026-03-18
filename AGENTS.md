# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 16** single-page portfolio visualization app (no monorepo, no Docker, no database). See `README.md` for standard scripts (`pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`).

### Key dev notes

- **Package manager**: pnpm (lockfile: `pnpm-lock.yaml`).
- **Dev server**: `pnpm dev` starts Turbopack on port 3000. Both the frontend and API routes (`/api/portfolio`, `/api/portfolio/refresh`) are served by the same process.
- **External dependency**: The API routes call Yahoo Finance via `yahoo-finance2` — no API key required, but internet access is needed for live data. Tests mock Yahoo Finance and do not require internet.
- **No env vars needed**: The app works out of the box with `pnpm install && pnpm dev`.
- **Lint**: `pnpm lint` runs ESLint. There are pre-existing React Compiler lint errors (impure `Date.now()` call, `setState` in effects) — these are in the existing codebase.
- **Tests**: `pnpm test` runs Vitest (85 tests, all mocked, no network needed).
- **Build**: `pnpm build` produces a production build.
- **Sample data**: Upload `/workspace/sample/Portfolio_Positions_Sample.csv` via the UI to test end-to-end.
- **pnpm build scripts**: `sharp` and `unrs-resolver` have native build scripts that pnpm may warn about. These are non-critical for dev — `sharp` is only used by the favicon generation script, not the app itself.
