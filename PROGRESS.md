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

- [ ] Ledger service, transfer service (§8.3), held-transfer review (§8.4), risk rules and manual flags (§8.7), reversal.
- [ ] Transaction list and detail routes with filters, search, pagination; on-screen and PDF receipts.
- [ ] UI: transfer flow, transaction history, staff/admin transaction pages, review queue, flag resolution.
- [ ] Integration tests 1–7, 10, and 11 from §13.
- [ ] Phase gate + commit `feat(phase-7)`.

## Phase 7 — Transaction management

- [ ] Ledger service, transfer service (§8.3), held-transfer review (§8.4), risk rules and manual flags (§8.7), reversal.
- [ ] Transaction list and detail routes with filters, search, pagination; on-screen and PDF receipts.
- [ ] UI: transfer flow, transaction history, staff/admin transaction pages, review queue, flag resolution.
- [ ] Integration tests 1–7, 10, and 11 from §13.
- [ ] Phase gate + commit `feat(phase-7)`.

## Phase 8 — Deposit and withdrawal workflows

- [ ] Request services and routes with holds, approval limits, maker-checker (§8.5).
- [ ] UI: customer request form and history; staff/admin queue with confirm dialogs.
- [ ] Integration test 8. Extend the seed with history and pending requests.
- [ ] Phase gate + commit `feat(phase-8)`.

## Phase 9 — Loan management

- [ ] Loan products, application with EMI preview, notes, forward, approve, reject, disburse, repay, completion (§8.6).
- [ ] UI: apply, list, detail, staff review, admin decision and disbursement.
- [ ] Integration test 9. Extend the seed with loans in every status.
- [ ] Phase gate + commit `feat(phase-9)`.

## Phase 10 — Admin and staff dashboards

- [ ] Stats services and routes (§12).
- [ ] Admin overview, staff work queues, bank settings page, staff management, audit log page.
- [ ] Customer overview completed with real stats.
- [ ] Phase gate + commit `feat(phase-10)`.

## Phase 11 — Charts, notifications, and optional features

- [ ] Every PRD §7 chart with Recharts using real data, §3.7 rules, range toggles, table view.
- [ ] Notification center (bell, popover, page, mark as read) and every event type from §8.10.
- [ ] CSV and PDF statements (§8.11).
- [ ] Dark mode polish across every page.
- [ ] Optional 2FA only if every core phase is green; otherwise skip and record decision.
- [ ] Phase gate + commit `feat(phase-11)`.

## Phase 12 — Security testing and error handling

- [ ] Complete the §13 test suite (including test 12) and make it pass.
- [ ] Audit every §5.5 item; add security headers; re-check role enforcement and ownership.
- [ ] Error boundaries, not-found pages, inline form errors, toasts, retry states everywhere.
- [ ] Full seed + `verify:ledger` passes; manual click-through of every role's main flows.
- [ ] Phase gate + commit `feat(phase-12)`.

## Phase 13 — Deployment and documentation

- [ ] README complete (§16) with demo credentials and Mermaid diagrams.
- [ ] Production build passes; Vercel and Atlas instructions verified.
- [ ] Final pass over §18 checklist; update `PROGRESS.md` to all done.
- [ ] Phase gate + commit `feat(phase-13)`.
