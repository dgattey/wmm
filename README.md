# Where's my money?

Visualize your Fidelity portfolio allocation. Upload a CSV export, see an interactive treemap and sortable table enriched with live Yahoo Finance data.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — upload your Fidelity positions CSV and explore.

## Scripts

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm start        # Start production server
pnpm test         # Run tests
pnpm lint         # Lint
pnpm typecheck    # Run TypeScript checks
```

## Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS v4** with system dark/light mode
- **yahoo-finance2** for live quotes + fund holdings
- **d3-hierarchy** for treemap layout (computed server-side)
- **Vitest** + **React Testing Library** for tests
- **React Compiler** enabled for auto-memoization

## Deploy

Standard Next.js deployment on [Vercel](https://vercel.com). No environment variables required.
