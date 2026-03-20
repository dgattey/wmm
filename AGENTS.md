# Portfolio Allocation — Agent Guide

Instructions for AI coding agents working in this repo.

## What This Repo Does

**Portfolio Allocation** is a Next.js app that visualizes Fidelity portfolio allocation. Users upload a Fidelity positions CSV, then see an interactive treemap and sortable table enriched with live Yahoo Finance data (quotes, fund holdings).

- **Upload flow**: Home parses CSV → persists positions in `localStorage` → navigates to `/portfolio/:id` → client `POST /api/portfolio` loads Yahoo quotes/holdings → `PortfolioData` for the dashboard
- **Client state**: `usePortfolio` hook manages upload, storage (localStorage), filters, sort, expand/collapse, view mode (holdings vs positions), treemap grouping (fund vs holding)
- **Data flow**: `lib/server/portfolioData.ts` orchestrates; `yahoo.ts` handles Yahoo Finance API with caching, retries, symbol mapping

## Environment Setup (Cloud & Local)

### Requirements

- **Node**: ≥24 (matches Vercel)
- **Package manager**: `pnpm` (lockfile is `pnpm-lock.yaml`)

### First-time setup

```bash
pnpm install
# Or, to install + verify: pnpm setup
```

No environment variables are required. No API keys needed.

### Cloud agent quick start

In ephemeral/cloud environments (e.g. Cursor cloud agent, CI), run:

```bash
pnpm setup
```

This runs `pnpm install && pnpm typecheck`. Optionally add `&& pnpm test && pnpm build` to fully validate. The app uses Yahoo Finance public APIs only; no API keys needed.

### Verify setup

```bash
pnpm typecheck   # TypeScript
pnpm lint        # ESLint
pnpm test        # Vitest
pnpm build       # Next.js production build
```

All four should pass. Run them before committing.

## Project Layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router: `page.tsx`, `layout.tsx`, `api/portfolio/route.ts` |
| `app/components/` | React UI: `Dashboard`, `TreeMap`, `PortfolioTable`, `UploadView`, toolbar, primitives |
| `lib/` | Pure logic: CSV parsing, treemap layout, types, filters, sort, `storage` + `portfolioIdb` |
| `lib/server/` | Server-only: Yahoo API, aggregation, `portfolioData` builder |
| `hooks/` | `usePortfolio`, `useTimeAgo` |
| `vitest.setup.ts` | Vitest + jsdom + matchMedia mock |

## Commands

| Command | Description |
|--------|-------------|
| `pnpm setup` | Install deps + typecheck (use in cloud/CI) |
| `pnpm dev` | Dev server (Turbopack) at http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm test` | Run Vitest once |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

## Migration & change philosophy

Don’t preserve backwards compatibility by default. When changing something, prefer migrating to one new approach and removing the old one. Aim for cleaner code and simpler logic with a single, consistent way of doing things. Keep compatibility or multiple paths only when explicitly requested.

## Migration & change philosophy

We don't maintain backwards compatibility. When making changes, migrate to one new way of doing things (unless otherwise stated). Prefer cleaner code and simpler logic with a single approach over supporting multiple patterns.

## Code Conventions

- **TypeScript**: Strict mode. Prefer `interface` for object types.
- **Styling**: Tailwind v4 utility classes. Theme tokens via `var(--*)` in Tailwind config.
- **Components**: Co-locate tests in `__tests__/` next to source (e.g. `app/components/__tests__/Dashboard.test.tsx`).
- **Server**: Yahoo logic in `lib/server/`; `"use cache"` used for quote/holdings caching.

## Testing

- Vitest + React Testing Library + jsdom
- `vitest.setup.ts` injects `matchMedia` mock and RTL cleanup
- Tests use `NODE_ENV=test`; Yahoo layer bypasses Next cache for deterministic runs
- Run `pnpm test` before pushing

## Git & PRs

- Branch from `main`; merge back via PR
- Commit messages: clear, imperative (e.g. "Add treemap grouping toggle")
- Pre-merge: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` must pass

## Known Behaviors

- **Yahoo rate limits**: `yahoo.ts` retries on 429; fallback to last-good quote/holdings on failure
- **Symbol mapping**: 401k-style identifiers may resolve via Yahoo search; `SKIP_SYMBOLS` (e.g. FZFXX) skip fetch
- **Client storage**: Portfolios in **IndexedDB** (`wmm-portfolios`); dashboard saves use a single `put` per record; add/remove/touch persist **deltas** (delete evictions + `put` only changed rows) instead of clearing the object store each time (`lib/storage.ts`, `lib/portfolioIdb.ts`)
