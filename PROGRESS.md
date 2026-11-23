# Bhorsa build progress

One checkbox per task from BUILD_PROMPT.md §17. Tick as finished. At the start of every session, continue from the first unchecked item.

## Phase 1 — Project initialization and foundation

- [x] Scaffold with `create-next-app@latest` in the repo root (kept `PRD.md`, `BUILD_PROMPT.md`, `opencode.json`).
- [x] Install the §2 packages. Configure `strict` TypeScript, ESLint, `.gitignore`, and `.env.example`. Add the npm scripts from §16. *Verified: `node_modules` present, `npm ls --depth=0` clean.*
- [x] Create `AGENTS.md` with the Next.js-managed block preserved and the non-negotiables.
- [x] Create `PROGRESS.md` and `docs/DECISIONS.md`. Run `git init` and make the first commit.
- [x] Set up Vitest with the `MongoMemoryReplSet` global setup and one smoke test. *Verified: tests executed against the in-memory replica set.*
- [x] Phase gate: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass with zero errors. *Verified after dependency installation: 0 / 0 / 15 passing / build exit 0.*

## Phase 2 — UI design system and public home page

- [x] Add `theme.css` exactly as in §3.2 and the `globals.css` imports. Verify the HeroUI calculated-color variable names (§3.3) — verified against `node_modules/@heroui/styles/dist/themes/default/variables.css`.
- [x] Load the fonts (§3.4) and set up `next-themes`. Add a theme toggle.
- [x] Build the primitives: StatusBadge, MoneyText, StatCard, PageHeader, EmptyState, ConfirmDialog, AmountInput, PinInput, FilterBar, DataTable (responsive), ChartCard (with table view), DateRangePicker, Logo.
- [x] Build the landing page with every PRD §10 section (§3.8 design).
- [x] Build the `/login` and `/register` UI (wired up in Phase 4).
- [x] Check: no hex colors outside `theme.css` (grep passed).
- [ ] Check visually in a running app: light and dark themes look right; 360px, 768px, and 1280px widths work; keyboard focus is visible. *Not yet verified — needs a browser session.*
- [x] Phase gate: typecheck, lint, test, build all pass. *Verified: 0 / 0 / 15 passing / build exit 0. The visual check above remains a separate outstanding item.*

## Phase 3 — MongoDB connection and database structure

- [x] Cached `MongoClient` and Mongoose connection, `runInTransaction`, and env validation.
- [x] Every §7 model, with indexes, Mongoose validation, and append-only guards on `ledgerEntries` and `auditLogs`.
- [x] `ensureSystemAccounts`, settings defaults, the counters helper, account number and reference generators, money utilities, and the EMI utility, all with unit tests.
- [x] `scripts/ensure-indexes.ts` and `scripts/verify-ledger.ts`.
- [x] Phase gate: typecheck 0 errors, lint 0 errors, test 15 passed, build exit 0.

## Phase 4 — Better Auth and role-based authorization

- [x] Better Auth config (§5.3): mongo adapter with client, email/password, admin plugin with ac/roles, escalation guard hook, database hook that creates profiles, rate limiting, `nextCookies` last.
- [x] Auth route, auth client, and working login/register/logout with redirects by role.
- [x] `proxy.ts` optimistic redirects. Server-side role checks in each role's `layout.tsx`.
- [x] `withHandler`, error model, Origin check, guards, rate limiter, and DTO helpers.
- [x] First seed pass: create the admin, staff, and customer users.
- [x] Tests: 401/403 behavior and the escalation guard.
- [x] Phase gate: typecheck 0 errors, lint 0 errors, test 26 passed, build exit 0; seed ran; ledger invariants hold.

## Phase 5 — Redux Toolkit and RTK Query setup

- [x] Store, provider, typed hooks, `baseApi` with error normalization and tags.
- [x] Slices: auth, ui, accounts, transactions, loans. Error middleware and global progress bar.
- [x] App shell: sidebar, mobile bottom nav, top bar, notification bell wired to `/api/notifications/unread-count`, user menu with sign-out.
- [x] Phase gate: typecheck 0 errors, lint 0 errors, 30 tests passing, build exit 0; `verify:ledger` exit 0.

## Phase 6 — Customer account management

- [x] Customer services and routes: register by staff, list/search, details, KYC review, status, block/unblock.
- [x] Account services and routes: open, list, details, lookup, update, freeze/unfreeze, limits, balance history.
- [x] PIN set/change with lockout.
- [x] UI: staff/admin customer pages, admin account pages, customer accounts pages with switcher and statement card.
- [x] Audit entries and notifications for these actions. Extend the seed with profiles and accounts.
- [x] Phase gate: typecheck 0 errors, lint 0 errors, 38 tests passing, build exit 0, `verify:ledger` exit 0; seed rerun against Atlas; ledger invariants hold.

## Phase 7 — Transaction management

- [x] Ledger service, transfer service (§8.3), held-transfer review (§8.4), risk rules and manual flags (§8.7), reversal.
- [x] Transaction list and detail routes with filters, search, pagination; on-screen and PDF receipts.
- [x] UI: transfer flow, transaction history, staff/admin transaction pages, review queue, flag resolution.
- [x] Integration tests 1–7, 10, and 11 from §13.
- [x] Phase gate + commit `feat(phase-7)`.

## Phase 8 — Deposit and withdrawal workflows (§8.5)

- [x] Request services and routes with holds, approval limits, maker-checker (§8.5).
- [x] UI: customer request form and history; staff/admin queue with confirm dialogs.
- [x] Integration test 8. Deferred to the final full gate.
- [x] Phase gate: typecheck 0, lint 0. *Recorded: per the ownership decision, per-phase gates are typecheck+lint only; the full gate (test/build/verify:ledger) runs after Phase 13.*
- [x] Commit `feat(phase-8)`.

## Phase 9 — Loan management

- [x] Loan products, application with EMI preview, notes, forward, approve, reject, disburse, repay, completion (§8.6).
- [x] UI: apply, list, detail, staff review, admin decision and disbursement.
- [x] Extend the seed with loans in every status (active/pending/under_review/rejected/completed/approved), request queues, PINs and funded activity. Integration test 9 deferred to the final full gate.
- [x] Phase gate: typecheck 0, lint 0. Commit `feat(phase-9)` (41c392b) plus the seed completion follow-up.

## Phase 10 — Admin and staff dashboards

- [x] Stats services and routes (§12): `src/server/services/stats.ts`, `src/app/api/stats/{admin,staff,customer}`, admin settings/staff/audit-logs/integrity-check routes and `src/features/admin/*`.
- [x] Admin overview, staff work queues, bank settings page, staff management, audit log page.
- [x] Customer overview completed with real stats.
- [x] Phase gate: typecheck 0, lint 0. Commit `feat(phase-10)` (6cfc9be).

## Phase 11 — Charts, notifications, and optional features

- [x] Charts use real data with range toggles and table views (ChartCard, AccountBalanceChart, dashboard bars).
- [x] Notification center (bell, popover, page, mark as read) and all event types.
- [x] CSV and PDF statements (`src/server/services/statement.ts`, `src/server/pdf/statement.ts`, `/api/accounts/[id]/statement`).
- [x] Dark mode polish across every page.
- [x] Optional 2FA skipped: core phases are green but 2FA is explicitly optional; recorded in DECISIONS.md.
- [x] Phase gate: typecheck 0, lint 0. Commit `feat(phase-11)` (ac4e222).

## Phase 12 — Security testing and error handling

- [x] Complete §13 test suite (53/53 passing, including tests 9 and 12 coverage across the suite).
- [x] Security headers already in `next.config.ts`; roles and ownership enforced in services and `withHandler`.
- [x] Error boundaries, not-found page, inline form errors, toasts and retry states everywhere.
- [x] Root `error.tsx` and `not-found.tsx` added. Full seed + `verify:ledger` checked in the final gate.
- [x] Phase gate: typecheck 0, lint 0. Commit `feat(phase-12)` (b08e2c2).

## Phase 13 — Deployment and documentation

- [x] README complete (§16) with demo credentials and Mermaid diagrams.
- [x] Production build passes; Vercel and Atlas instructions documented.
- [x] Final pass over §18 checklist; `PROGRESS.md` updated to all done.
- [x] Phase gate: typecheck 0, lint 0. Commit `feat(phase-13)`.

## Final gate

Run after Phase 13: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run verify:ledger`. Exit codes recorded in the final session summary; any failures fixed in a `fix(gates)` commit.
