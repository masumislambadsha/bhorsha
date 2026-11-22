<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bhorsa — agent rules

Read these files completely before changing anything:

- `BUILD_PROMPT.md` — the authoritative build specification (stack, architecture, rules, phase plan).
- `PROGRESS.md` — the phase checklist. Continue from the first unchecked item.
- `docs/DECISIONS.md` — decisions already made; add one line for each new decision.
- `PRD.md` — the product requirements document (the "what").

## Commands

- `npm run dev` — development server
- `npm run build` — production build (does NOT run ESLint in Next 16)
- `npm run start` — production server
- `npm run lint` — ESLint (`eslint .`)
- `npm run typecheck` — TypeScript (`tsc --noEmit`)
- `npm run test` — Vitest (`vitest run`)
- `npm run seed` — seed demo data (requires `SEED_ALLOW_RESET=true`)
- `npm run ensure-indexes` — create MongoDB indexes
- `npm run verify:ledger` — check ledger invariants

## Non-negotiables

- **HeroUI v3** (`@heroui/react` + `@heroui/styles`): no `HeroUIProvider`, no `heroui()` Tailwind plugin, no `classNames`, no `color="primary"`. Use `variant`, `onPress`, `isPending`, `isDisabled`, `fullWidth`, `isIconOnly`, `className`. Look up every component before use.
- **Next.js 16**: interception is `src/proxy.ts` exporting `proxy` (Node runtime). `params` and `searchParams` are Promises — always `await` them. `next lint` does not exist.
- **Zod 4**: `z.email()`, `z.uuid()`, `error` option (not `required_error`).
- **Money**: integer paisa everywhere, fields ending in `Minor`. Never float. Every money movement is one MongoDB transaction with balanced ledger entries.
- **Authorization**: enforce on the server in every route and service. UI hiding is cosmetic only. Ownership violations return 404.
- **Colors**: no hex colors outside `src/styles/theme.css`. Use theme tokens.
- **No fake data**: charts, totals, and counts come from real aggregations. The public site shows no fake social proof.
- **Server-only**: every file under `src/server/` starts with `import "server-only";`.
- **Phase gate**: a phase is done only when `typecheck`, `lint`, `test`, and `build` all pass with zero errors. Then commit `feat(phase-N): <summary>`. Never push.
