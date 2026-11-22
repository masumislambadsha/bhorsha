# Bhorsa — Digital Banking Management System
## Build prompt for OpenCode

You are building a complete, production-quality **simulated** digital banking web app from an empty repository. `PRODUCT_REQUIREMENTS.md` (the PRD) defines *what* to build. This file defines *how*: stack, architecture, business rules, design system, and a phase-by-phase plan with acceptance checks.

- Where this file is more specific than the PRD, follow this file.
- Never go below the PRD's security requirements (PRD §5.1, §8).
- The app never touches real money, cards, or payment gateways (PRD §15).

---

## 0. Operating rules (read first, follow always)

1. **Work autonomously.** Don't stop to ask questions. When something is ambiguous, choose the safest reasonable option, record it in `docs/DECISIONS.md` (one line: decision + reason), and keep going.
2. **Track progress.** Keep `PROGRESS.md` at the repo root with one checkbox per task from §17. Tick items as you finish them. At the start of every session, read `PROGRESS.md` and continue from the first unchecked item. Don't redo finished work unless it's broken.
3. **Phase gate.** A phase is done only when `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build` all pass with zero errors. Fix failures before starting the next phase. Then commit: `git add -A && git commit -m "feat(phase-N): <summary>"`. Never push.
4. **Your training data is out of date for this stack.** Before using an API you aren't certain about, check current docs:
   - **HeroUI v3:** use the `heroui-react` MCP tools if they're available. Otherwise fetch `https://heroui.com/react/llms.txt` and the pages it links (quick start, theming, colors, dark mode, each component).
   - **Next.js 16:** read the version-matched docs bundled in `node_modules/next/dist/docs/`. Running `next dev` writes a Next.js-managed block into `AGENTS.md` that points to them. Never delete that block. Note that `next build` no longer runs ESLint, so lint is its own step in the phase gate.
   - **Better Auth:** `https://better-auth.com/docs` — especially `/docs/plugins/admin`, `/docs/adapters/mongo`, `/docs/integrations/next`, `/docs/concepts/hooks`.
5. **Known traps.** Each of these has broken previous attempts:
   - **HeroUI is v3, not v2/NextUI.** There is no `HeroUIProvider`, no `heroui()` Tailwind plugin, no `@heroui/theme` package, no `classNames` prop, no `color="primary"` on Button. v3 is `@heroui/react` + `@heroui/styles`, themed with CSS variables, built from compound components, styled with `className`. Button uses `variant` (`primary` is the default; also `secondary`, `tertiary`, `outline`, `ghost`, `danger`, `danger-soft`) and `onPress`, `isPending`, `isDisabled`, `fullWidth`, `isIconOnly`. Look up every component before using it.
   - **Next.js 16:** request interception lives in `src/proxy.ts` exporting `proxy` (not `middleware.ts`), and it runs on Node. `params` and `searchParams` are Promises, so `await` them. `next lint` no longer exists; run ESLint directly.
   - **Better Auth's MongoDB adapter is its own package:** `import { mongodbAdapter } from "@better-auth/mongo-adapter"`. Pass `{ client }` so Better Auth uses transactions.
   - **Zod 4:** use `z.email()`, `z.uuid()`, and the `error` option (`z.string({ error: "Enter your name" })`). The Zod 3 options `required_error` and `invalid_type_error` are silently ignored.
   - **MongoDB transactions need a replica set.** MongoDB Atlas (including the free tier) works. A plain local `mongod` doesn't.
   - **Inside a MongoDB transaction:** pass `{ session }` to every operation, run operations one after another (never `Promise.all`, because the driver doesn't support parallel operations in one transaction), use the array form `Model.create([doc], { session })`, and never do external side effects, because the callback can be retried.
   - **Money is never a float.** See §6.
6. **Code quality.** TypeScript `strict`. No `any` (use `unknown` and narrow it). Small files (aim for under 250 lines). Feature-based folders (§4). Server-only modules start with `import "server-only"`. No secrets in client code or in `NEXT_PUBLIC_*` variables. No hex colors outside `src/styles/theme.css`. No lorem ipsum or hardcoded sample data in the app UI; everything renders from the database, filled by the seed script (§14).
7. **Don't fake it.** Charts, totals, and counts come from real aggregations. The public site has no fake testimonials, partner logos, ratings, user counts, or regulatory badges. The footer and auth pages say clearly that this is a simulated bank.

---

## 1. Product summary

- **Brand:** Bhorsa (from Bengali ভরসা, "trust"). Keep every brand string in `src/config/app.ts` (`APP_NAME`, `APP_TAGLINE`, `SUPPORT_EMAIL`, `SIMULATION_NOTICE`) so renaming the bank takes one edit.
- **Currency:** Bangladeshi taka (BDT, ৳). **Time zone:** Asia/Dhaka (UTC+6, no daylight saving).
- **Roles:** admin, staff, customer, as described in PRD §4.
- **Core journey:** a customer registers → staff verify their KYC (identity details) → staff or admin open bank accounts for them → the customer requests deposits or withdrawals (staff approve), sends transfers (instant, or held for review when large or risky), and applies for loans (staff review and forward, admin approves and disburses, the customer repays) → the admin monitors analytics, flags, limits, and bank-wide settings.

---

## 2. Tech stack

Install the latest stable release of each package within these major versions:

| Concern | Packages |
|---|---|
| Framework | `next@16`, `react@19`, `react-dom@19`, `typescript` |
| UI | `@heroui/react@3`, `@heroui/styles@3`, `tailwindcss@4`, `lucide-react`, `next-themes` |
| Auth | `better-auth@1` (1.7 or newer), `@better-auth/mongo-adapter`, `mongodb` (driver) |
| App data | `mongoose` |
| State | `@reduxjs/toolkit@2`, `react-redux@9` |
| Forms | `react-hook-form@7`, `@hookform/resolvers@5`, `zod@4` |
| Charts | `recharts@3` |
| PDF | `pdf-lib` |
| Tests | `vitest`, `mongodb-memory-server` |
| Scripts | `tsx` |

You may add small libraries when they clearly help. Record each one in `docs/DECISIONS.md` and the README.

**Why two MongoDB libraries:** Better Auth's adapter needs a native `MongoClient`. App collections use Mongoose for schemas, validation, and indexes. Both connect to the same database through cached connections (§5.1). Money operations only touch Mongoose models, so every financial transaction runs on one connection.

---

## 3. Design system: "Petrol, Mist, Lime"

### 3.1 Concept

The look follows a three-color formula: one strong main color, one calm neutral that covers most of the screen, and one rare pop color.

- **Petrol `#0B5563`: the main brand color.** Used on large surfaces: the dashboard sidebar, the landing hero band, the balance card, headings, links, and focus rings.
- **Mist `#F2F5F4`: the neutral canvas** that covers most of the screen. Cards are white on mist.
- **Lime `#C8F169`: the pop.** Used only for the main action on a screen (Open account, Get started, Send money, Confirm transfer, Submit application), the active navigation indicator, selected states, and tiny highlights. Lime covers no more than about 5% of any screen. **Use at most one lime button per view.** Never use lime for text or icons on light backgrounds (1.3:1 contrast). Text on lime is petrol ink `#0A2E35`.
- Green, red, and amber appear only in small status badges and in money-in/money-out amounts.

### 3.2 Theme tokens

Create `src/styles/theme.css` with exactly this content. Every text/background pair was checked for WCAG AA (4.5:1) in both modes, and the chart colors passed a colorblind-safety check.

```css
/* Bhorsa theme for HeroUI v3: Petrol (brand), Mist (neutral), Lime (accent).
   Import after "@heroui/styles" in globals.css and keep it unlayered so it overrides HeroUI defaults. */

:root,
.light,
[data-theme="light"] {
  color-scheme: light;

  /* Neutrals */
  --background: #F2F5F4;            /* mist canvas */
  --foreground: #0F2328;            /* ink */
  --surface: #FFFFFF;               /* cards */
  --surface-secondary: #F7F9F8;
  --surface-tertiary: #EBF0EF;
  --overlay: #FFFFFF;               /* popovers, modals */
  --muted: #56676B;                 /* secondary text */
  --border: #DCE3E1;
  --separator: #E4EAE8;
  --default: #E6ECEB;               /* neutral buttons and chips */
  --default-foreground: #0F2328;

  /* Accent = lime pop (HeroUI primary buttons, selected states) */
  --accent: #C8F169;
  --accent-foreground: #0A2E35;     /* petrol ink on lime */
  --accent-hover: #BBE656;
  --accent-soft: #EEF9D6;
  --accent-soft-foreground: #3D5C0C;

  --focus: #0B5563;                 /* petrol focus ring: lime is invisible on white */
  --link: #0B5563;

  /* Brand = petrol (custom token: sidebar, hero band, balance card) */
  --brand: #0B5563;
  --brand-foreground: #F2F5F4;
  --brand-hover: #094955;
  --brand-soft: #E1EEEF;
  --brand-soft-foreground: #0B5563;

  /* Status */
  --success: #157A42;               --success-foreground: #FFFFFF;
  --success-soft: #E3F4EA;          --success-soft-foreground: #157A42;
  --warning: #E89B17;               --warning-foreground: #2B1A00;
  --warning-soft: #FDF0DC;          --warning-soft-foreground: #9A5200;
  --danger: #C0362C;                --danger-foreground: #FFFFFF;
  --danger-soft: #FDE8E6;           --danger-soft-foreground: #B42318;
  --info: #5B3CC4;                  --info-foreground: #FFFFFF;          /* "under review" */
  --info-soft: #EEEAFC;             --info-soft-foreground: #5B3CC4;
  --frozen: #0B6E99;                --frozen-foreground: #FFFFFF;        /* frozen accounts */
  --frozen-soft: #E0F2FB;           --frozen-soft-foreground: #0B6E99;

  /* Charts, fixed order: deposit, withdrawal, transfer, loan disbursement, loan repayment */
  --chart-1: #00759A;
  --chart-2: #CD5630;
  --chart-3: #7553BD;
  --chart-4: #669014;
  --chart-5: #2A61B1;
}

.dark,
[data-theme="dark"] {
  color-scheme: dark;

  --background: #081417;
  --foreground: #E6EEEC;
  --surface: #0F1F23;
  --surface-secondary: #132629;
  --surface-tertiary: #183036;
  --overlay: #132629;
  --muted: #8FA3A6;
  --border: #1E3338;
  --separator: #1A2D31;
  --default: #1A2E33;
  --default-foreground: #E6EEEC;

  --accent: #C8F169;
  --accent-foreground: #0A2E35;
  --accent-hover: #D4F584;
  --accent-soft: #1F3318;
  --accent-soft-foreground: #C8F169;

  --focus: #C8F169;
  --link: #5CC4CF;

  --brand: #0D3A43;
  --brand-foreground: #E6EEEC;
  --brand-hover: #11464F;
  --brand-soft: #123238;
  --brand-soft-foreground: #7FD3DC;

  --success: #2FB36A;               --success-foreground: #04210F;
  --success-soft: #0F2A1C;          --success-soft-foreground: #5BD08A;
  --warning: #F5B04A;               --warning-foreground: #2B1A00;
  --warning-soft: #2E2008;          --warning-soft-foreground: #F5B04A;
  --danger: #F2685E;                --danger-foreground: #2A0503;
  --danger-soft: #321211;           --danger-soft-foreground: #F97066;
  --info: #A99BF5;                  --info-foreground: #1A1240;
  --info-soft: #221B45;             --info-soft-foreground: #A99BF5;
  --frozen: #5CC3F0;                --frozen-foreground: #04202E;
  --frozen-soft: #0B2633;           --frozen-soft-foreground: #5CC3F0;

  --chart-1: #0097AB;
  --chart-2: #C95A37;
  --chart-3: #886ACF;
  --chart-4: #6D952C;
  --chart-5: #407BC5;
}

/* Bridge tokens into Tailwind utilities: bg-brand, text-info-soft-foreground, fill-chart-1, font-display ... */
@theme inline {
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-brand-hover: var(--brand-hover);
  --color-brand-soft: var(--brand-soft);
  --color-brand-soft-foreground: var(--brand-soft-foreground);

  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);
  --color-accent-soft-foreground: var(--accent-soft-foreground);
  --color-success-soft: var(--success-soft);
  --color-success-soft-foreground: var(--success-soft-foreground);
  --color-warning-soft: var(--warning-soft);
  --color-warning-soft-foreground: var(--warning-soft-foreground);
  --color-danger-soft: var(--danger-soft);
  --color-danger-soft-foreground: var(--danger-soft-foreground);

  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-info-soft: var(--info-soft);
  --color-info-soft-foreground: var(--info-soft-foreground);
  --color-frozen: var(--frozen);
  --color-frozen-foreground: var(--frozen-foreground);
  --color-frozen-soft: var(--frozen-soft);
  --color-frozen-soft-foreground: var(--frozen-soft-foreground);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --font-sans: var(--font-plex), var(--font-bengali), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-newsreader), Georgia, serif;
}
```

`src/app/globals.css` starts with:

```css
@import "tailwindcss";
@import "@heroui/styles";
@import "../styles/theme.css";
```

### 3.3 HeroUI mapping notes

- `--accent` is lime, so HeroUI's default (`primary`) buttons, checkboxes, switches, and selected tabs render lime with petrol-ink text. That's intended.
- `--focus` and `--link` are overridden so focus rings and links stay readable: petrol in light mode, lime and light petrol in dark mode.
- HeroUI derives hover and soft variants itself ("calculated colors"). Open `node_modules/@heroui/styles` (the default theme's `variables.css` and the shared theme file), find the exact variable names it uses for accent, success, warning, and danger hover/soft/soft-foreground, and make sure they resolve to the values in §3.2. Verify the names; don't guess them.
- If a HeroUI component still shows a default color that clashes with this palette, override that component's documented variable or class in `theme.css`, never with inline hex.
- Light mode only: if lime buttons look undefined on white surfaces, give `.button--primary` a subtle 1px inset edge of `rgb(10 46 53 / 16%)`, and confirm the focus ring still shows.
- Dark mode uses `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and `disableTransitionOnChange`. Add `suppressHydrationWarning` to `<html>`.

### 3.4 Typography

- **Display:** Newsreader (via `next/font/google`, variable `--font-newsreader`) for landing headlines, marketing section titles, app page titles (28px, weight 500), and the big balance figure.
- **UI and body:** IBM Plex Sans (weights 400, 500, 600; variable `--font-plex`) for everything else.
- **Taka sign fallback:** Plex has no ৳ glyph. Load Noto Sans Bengali (subset `bengali`, variable `--font-bengali`) and keep it after Plex in the font stack so the browser uses it only for ৳.
- Use `tabular-nums` on every amount, account number, and table cell with numbers.
- Type scale: 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 / 48 / 64 px. Body text 15–16px, tables 14px, captions 12–13px. Keep lines under 80 characters.
- Sentence case everywhere. No ALL-CAPS labels and no small uppercase eyebrow text above headings.

### 3.5 Status badges

Build one `StatusBadge` component with a typed map. Every badge shows an icon and a text label; color is never the only signal. Pick fitting `lucide-react` icons and confirm each icon name exists in the installed version.

| Domain | Status | Colors (bg / text) | Icon idea |
|---|---|---|---|
| Transaction | Completed | success-soft | check circle |
| Transaction | Pending | warning-soft | clock |
| Transaction | Failed | danger-soft | x circle |
| Transaction | Reversed | default | undo arrow |
| Request | Pending / Approved / Rejected | warning-soft / success-soft / danger-soft | clock / check / x |
| Loan | Pending | warning-soft | clock |
| Loan | Under review | info-soft | eye |
| Loan | Approved | success-soft | badge check |
| Loan | Rejected | danger-soft | x circle |
| Loan | Active | brand-soft | banknote |
| Loan | Completed | default | double check |
| Bank account | Active / Frozen / Closed | success-soft / frozen-soft / default | check / snowflake / lock |
| Customer | Active / Inactive / Blocked | success-soft / default / danger-soft | check / pause / ban |
| KYC | Pending / Verified / Rejected | warning-soft / success-soft / danger-soft | shield variants |
| Flag | Open / Resolved | warning-soft / default | flag / flag off |
| Installment | Due / Paid / Overdue | default / success-soft / danger-soft | calendar / check / alert |

### 3.6 Money display

- `src/lib/money.ts` exports `formatBDT(minor)` using `new Intl.NumberFormat("en-IN", { style: "currency", currency: "BDT", currencyDisplay: "narrowSymbol" })`, which produces `৳2,48,350.00` (lakh grouping).
- Money in: `+৳45,000.00` in `text-success-soft-foreground` with an arrow-down-left icon. Money out: `−৳5,000.00` (true minus sign U+2212) in `text-danger-soft-foreground` with an arrow-up-right icon. Always show the sign and the icon.
- In lists, mask account numbers as `•••• 4821`. On detail pages, show the full grouped number (`1110 0001 0004`) with a copy button.
- PDFs and CSVs write `BDT` instead of ৳ (standard PDF fonts don't include the glyph).

### 3.7 Charts (Recharts)

- **Categorical series** use `--chart-1` … `--chart-5` in the fixed order deposit, withdrawal, transfer, loan disbursement, loan repayment. A type keeps its color everywhere, even when filters remove other series.
- **Single-series charts** use `--chart-1`.
- **Loan approval statistics** are status data, so they use status colors (approved = success, rejected = danger, pending = warning, under review = info) with labels.
- Account types (savings, current, business) use chart-1, chart-3, and chart-5.
- Rules: thin bars with 4px rounded tops anchored to the baseline, 2px gaps between bars, quiet gridlines and axes, a legend whenever there are two or more series, tooltips with `formatBDT` values, a proper empty state when there's no data, and never two y-axes. Labels and values use text colors, not series colors. Each chart card offers a "View as table" toggle so the data is accessible without color.
- Charts are client components (`"use client"`). Data always comes from the stats endpoints (§12).

### 3.8 Layout and signature elements

**Public site (PRD §10)**
- **Navigation:** the wordmark "Bhorsa" in Newsreader plus a simple mark (petrol rounded square with a small lime dot, as inline SVG). Links: Features, How it works, Security. On the right: theme toggle, "Sign in" (ghost button), "Open account" (the lime button). On mobile, a menu sheet.
- **Hero:** an inset petrol band with 24px rounded corners. Left side: a short muted line ("Digital banking, simulated end to end"), the serif headline "Your money, kept safe and moving." with a 3px lime underline under "kept safe", one sentence of supporting copy, a lime "Open an account" button, and an outline "Sign in" button. Right side: an HTML/CSS composition of the product (balance card, two transaction rows, a small monthly bar chart with the latest bar in lime), marked `aria-hidden` and clearly sample content. It stacks below the copy on mobile.
- **Product highlights:** four items (instant transfers, savings/current/business accounts, loans with clear repayment schedules, statements and receipts) in a 2×2 layout where one tile is larger and shows a small UI fragment. Don't build four identical cards.
- **Core banking features:** alternating rows, each with text plus a small illustration built from real components (transfer review, EMI preview, status badges).
- **How it works:** four numbered steps, because this is a real sequence: create your profile → get verified by our staff → we open your accounts → bank from anywhere.
- **Security:** plain statements about mechanisms that actually exist in the code (atomic transfers, transaction PIN, server-side access checks, audit trail, automatic risk checks). No certifications or badges.
- **Call to action:** a petrol-soft panel with one lime button.
- **Footer:** brand, links, the simulation notice ("Bhorsa is a simulated bank for demonstration. No real money moves."), and the year.

**App shell**
- **Desktop (lg and up):** a fixed petrol sidebar (264px) with the logo, a role chip, grouped navigation, and the user card with sign-out at the bottom. The active item gets a subtle white wash and a 3px lime bar on the left. Inactive items still meet 4.5:1 contrast on petrol.
- **Tablet (md to lg):** a collapsible icon rail.
- **Mobile (below md):** a top bar plus a bottom navigation bar with four primary destinations and "More", which opens a drawer.
  - Customer: Home, Transfer, Activity, Loans, More.
  - Staff: Home, Customers, Queue, Loans, More.
  - Admin: Overview, Customers, Accounts, Activity, More.
- **Top bar:** the page title (Newsreader), the account switcher (customers only), a notification bell with an unread count, the theme toggle, and the user menu.
- **Content:** max width 1280px, 24px padding on desktop and 16px on mobile, white cards with 16px radius and a hairline border, no heavy shadows. Buttons are pill-shaped and inputs have a 12px radius.
- **Tables:** HeroUI Table inside a card, with a sticky header and row hover. Below md, each row becomes a stacked list item.
- **Transaction lists:** grouped by day with sticky headers ("Today", "Yesterday", "Sun, 22 Nov 2026").
- **Signature element: the statement card.** A petrol card showing the selected account (nickname and type), the masked number, the balance in large Newsreader numerals, "Available ৳X · On hold ৳Y", a lime "Send money" button, and ghost buttons for deposit and withdrawal requests.
- **Avoid:** gradient blobs, glassmorphism, stock 3D illustrations, grids of identical shadowed cards, emoji, and decorative numbering (01/02/03) anywhere except the How it works steps.

### 3.9 Copy

Plain, specific, active voice, sentence case. Buttons say exactly what happens ("Send money", "Approve deposit", "Freeze account"). Errors say what happened and what to do next. Avoid "successfully", "please", "seamless", "empower", and "unlock". Empty states invite an action; they don't apologize.

Examples:
- `INSUFFICIENT_FUNDS`: "Not enough available balance. You can send up to ৳12,400.00 and keep the ৳500.00 minimum balance."
- `LIMIT_DAILY`: "This would go over your ৳2,00,000.00 daily transfer limit. You can still send ৳35,000.00 today."
- `INVALID_PIN`: "Incorrect PIN. 2 attempts left."
- `PIN_LOCKED`: "Too many incorrect PIN attempts. Try again after 4:35 PM."
- `RECIPIENT_NOT_FOUND`: "No active account has that number. Check it and try again."
- Empty transactions: "No transactions yet. Send money or request a deposit to get started."

### 3.10 Accessibility and responsiveness

- Works from 360px wide up to large desktops, and on tablets.
- Visible keyboard focus everywhere, all controls reachable by keyboard, a skip-to-content link, and labels on every input. Icon-only buttons have `aria-label`.
- Respect `prefers-reduced-motion`. Keep motion to things that answer an action (dialogs, drawers, toasts) plus at most one entrance animation on the landing hero.
- Meet 4.5:1 contrast for text and 3:1 for UI boundaries. The tokens already meet this; don't add new colors without checking.

---

## 4. Project structure

```
.
├── AGENTS.md                  # condensed rules for every session (you create it, Phase 1)
├── BUILD_PROMPT.md            # this file
├── PRODUCT_REQUIREMENTS.md    # the PRD
├── PROGRESS.md                # phase checklist (you maintain it)
├── docs/DECISIONS.md          # one line per decision
├── opencode.json              # provided: HeroUI MCP server
├── scripts/
│   ├── seed.ts                # demo data (§14)
│   ├── ensure-indexes.ts
│   └── verify-ledger.ts       # integrity check (§6.4)
├── tests/                     # unit/ and integration/ (§13)
└── src/
    ├── proxy.ts               # optimistic redirects only
    ├── config/app.ts          # brand strings, currency, time zone
    ├── styles/theme.css
    ├── app/
    │   ├── layout.tsx         # fonts, ThemeProvider, StoreProvider, Toast provider
    │   ├── globals.css
    │   ├── (marketing)/page.tsx
    │   ├── (auth)/login/page.tsx
    │   ├── (auth)/register/page.tsx
    │   ├── customer/…         # layout.tsx enforces role on the server
    │   ├── staff/…
    │   ├── admin/…
    │   └── api/
    │       ├── auth/[...all]/route.ts
    │       └── …              # REST endpoints (§9)
    ├── components/
    │   ├── ui/                # StatusBadge, MoneyText, StatCard, PageHeader, EmptyState,
    │   │                      # ConfirmDialog, AmountInput, PinInput, DataTable, FilterBar, DateRangePicker
    │   ├── layout/            # AppShell, Sidebar, MobileNav, Topbar, AccountSwitcher,
    │   │                      # NotificationBell, ThemeToggle, UserMenu
    │   ├── charts/            # ChartCard, BarSeries, ChartTable
    │   └── marketing/         # landing sections
    ├── features/              # one folder per domain: accounts, transactions, transfers, requests,
    │   └── <feature>/         # loans, notifications, customers, admin, auth
    │       ├── api.ts         # RTK Query endpoints (injectEndpoints)
    │       ├── slice.ts       # client state, if any
    │       ├── schemas.ts     # Zod schemas shared by forms and route handlers (no server imports)
    │       ├── types.ts       # DTO types
    │       └── components/
    ├── store/                 # store.ts, hooks.ts, StoreProvider.tsx, baseApi.ts,
    │                          # ui.slice.ts, auth.slice.ts, errorMiddleware.ts
    ├── lib/                   # money.ts, time.ts, ids.ts, emi.ts, mask.ts, auth-client.ts,
    │                          # permissions.ts (isomorphic Better Auth access-control config)
    └── server/                # every file imports "server-only"
        ├── db/                # mongo-client.ts, mongoose.ts, transaction.ts, models/*.ts
        ├── auth/              # auth.ts (Better Auth), session.ts, guards.ts
        ├── http/              # handler.ts (withHandler), errors.ts, pagination.ts,
        │                      # idempotency.ts, rate-limit.ts, origin.ts
        ├── services/          # ledger, transfer, review, request, loan, account, customer, pin,
        │                      # risk, notification, audit, settings, stats, statement, integrity
        ├── dto/               # document → API response mappers
        └── pdf/               # receipt.ts, statement.ts
```

---

## 5. Backend foundations

### 5.1 Connections

- `src/server/db/mongo-client.ts` exports one `MongoClient` (from `MONGODB_URI`, `maxPoolSize: 10`), cached on `globalThis` so hot reloads and warm serverless invocations reuse it. Better Auth uses this client.
- `src/server/db/mongoose.ts` exports `connectDB()`: a cached `mongoose.connect` promise on `globalThis` with `bufferCommands: false` and `maxPoolSize: 10`. Define models as `models.X ?? model("X", schema)` to survive hot reloads.
- `src/server/db/transaction.ts` exports `runInTransaction(fn)`:

```ts
export async function runInTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const conn = await connectDB();
  let result!: T;
  await conn.connection.transaction(
    async (session) => { result = await fn(session); },  // may run more than once: no external side effects
    { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" },
  );
  return result;
}
```

- Route handlers use the Node runtime (the default). Never set `runtime = "edge"`. If Turbopack has trouble bundling `mongoose` or `mongodb`, add them to `serverExternalPackages` in `next.config.ts`.

### 5.2 Route handler wrapper and error model

Every API route goes through `withHandler(options, fn)` in `src/server/http/handler.ts`:

1. Create a request ID (used in logs and error responses).
2. `await connectDB()`.
3. For anything other than GET/HEAD, reject requests whose `Origin` header doesn't match the app origin (`NEXT_PUBLIC_APP_URL`, plus `TRUSTED_ORIGINS`) with 403. This is CSRF protection for cookie-authenticated routes.
4. Load the session with `auth.api.getSession({ headers: await headers() })`. If `options.roles` is set: return 401 without a session and 403 when the role doesn't match.
5. Validate `params`, `query`, and `body` with the given Zod schemas. On failure, return 422 with `{ error: { code: "VALIDATION_ERROR", message, fieldErrors } }`.
6. Apply `options.rateLimit`, if set (§5.5).
7. Run the handler. Map `AppError` to its status and code. Any unknown error becomes a 500 with a generic message, and the server logs it with the request ID. Never send stack traces to the client.

Error JSON is always `{ "error": { "code": "SNAKE_CASE_CODE", "message": "Human sentence.", "details"?: {...}, "requestId": "..." } }`.

Codes include: `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `CONFLICT` (409, state changed), `RATE_LIMITED` (429), `INSUFFICIENT_FUNDS`, `LIMIT_PER_TRANSACTION`, `LIMIT_DAILY`, `INVALID_PIN`, `PIN_LOCKED`, `PIN_NOT_SET`, `RECIPIENT_NOT_FOUND`, `RECIPIENT_NOT_ACTIVE`, `ACCOUNT_NOT_ACTIVE`, `SAME_ACCOUNT`, `KYC_REQUIRED`, `CUSTOMER_INACTIVE`, `POSSIBLE_DUPLICATE`, `IDEMPOTENCY_KEY_REUSED`, `SELF_APPROVAL_NOT_ALLOWED`, `APPROVAL_LIMIT_EXCEEDED`, `INVALID_STATE`, `REVERSAL_INSUFFICIENT_FUNDS`. Business-rule failures use 422, except state races, which use 409.

List endpoints accept `page` (≥ 1) and `pageSize` (1–100, default 20) and return `{ items, page, pageSize, total, totalPages }`.

Route handlers never return raw documents. Map them through `src/server/dto/*`, which drops PIN hashes, internal loan notes (customers never see them), risk flags (customers never see them), and other internal fields. DTOs expose money as integer `…Minor` fields and dates as ISO strings. Formatting happens on the client.

### 5.3 Authentication (Better Auth)

`src/server/auth/auth.ts`:

- `database: mongodbAdapter(mongoClient.db(), { client: mongoClient })`.
- `emailAndPassword: { enabled: true, minPasswordLength: 8 }`.
- Sessions: `expiresIn` 12 hours, `updateAge` 1 hour (a bank shouldn't keep week-long sessions).
- `rateLimit: { enabled: true, storage: "database" }`, because in-memory limits don't work across serverless instances.
- Plugins: `admin({ ac, roles, defaultRole: "customer", adminRoles: ["admin"] })`, then `nextCookies()` **last** in the array.
- `ac` and `roles` live in `src/lib/permissions.ts` (isomorphic so the client plugin can import them):
  - Build the statement from `defaultStatements` (`better-auth/plugins/admin/access`) with `createAccessControl` (`better-auth/plugins/access`).
  - `admin` gets `adminAc.statements` (full access).
  - `staff` gets `user: ["create", "get"]` only (to register customers).
  - `customer` gets no admin permissions.
- **Privilege-escalation guard:** add a `hooks.before` middleware (`createAuthMiddleware` from `better-auth/api`; check the docs for the helper that reads the current session inside a hook). For any path starting with `/admin/`: allow admins; allow staff only for `/admin/create-user` when the requested role is absent or `"customer"`; reject everything else with 403. Also reject any role field on `/sign-up/email`. Add tests for this.
- `databaseHooks.user.create.after`: when the new user's role is `customer`, create their `CustomerProfile` (`kycStatus: "pending"`, `status: "active"`).
- Mount the handler at `src/app/api/auth/[...all]/route.ts` with `toNextJsHandler(auth)` from `better-auth/next-js`.
- The client (`src/lib/auth-client.ts`) uses `createAuthClient` from `better-auth/react` with `adminClient({ ac, roles })`.
- Inspect a created user document to see whether the adapter stores IDs as ObjectId or string. Store app-level user references consistently with that, and centralize the conversion in one helper.
- **Blocking a customer** uses the admin plugin's ban: banned users can't sign in, and their sessions are revoked.

`src/proxy.ts` only does optimistic redirects. If there's no session cookie (`getSessionCookie` from `better-auth/cookies`) on `/customer/*`, `/staff/*`, or `/admin/*`, it redirects to `/login?next=…`. It is **not** a security boundary:
- Each role's `layout.tsx` checks the session on the server and redirects anyone with the wrong role to their own home.
- Every API route enforces auth again through `withHandler`.

### 5.4 Authorization

Enforce this matrix in services and route handlers (the UI hides what a role can't do, but that's only cosmetic):

| Action | Customer | Staff | Admin |
|---|---|---|---|
| View own accounts, transactions, requests, loans | ✓ (own only) | — | — |
| View any customer's data | — | ✓ | ✓ |
| Register customers, verify KYC | — | ✓ | ✓ |
| Open bank accounts for KYC-verified customers | — | ✓ | ✓ |
| Update account info, freeze/unfreeze, set limits | — | — | ✓ |
| Activate/deactivate or block/unblock customers | — | — | ✓ |
| Transfer, request deposit/withdrawal, apply for a loan, repay | ✓ | — | — |
| Approve/reject deposit or withdrawal requests | — | ✓ up to `staffApprovalLimit` | ✓ |
| Approve/reject held transfers | — | ✓ up to `staffApprovalLimit` | ✓ |
| Flag a transaction | — | ✓ | ✓ |
| Resolve flags, reverse transfers | — | — | ✓ |
| Add loan notes, forward loans to admin | — | ✓ | ✓ |
| Approve, reject, or disburse loans | — | — | ✓ |
| Edit bank-wide settings, create staff users, view audit log | — | — | ✓ |

Rules:
- **Ownership:** when a customer asks for a resource they don't own, return 404 (don't reveal that it exists).
- **Maker-checker:** nobody approves, rejects, forwards, reviews, or disburses anything they initiated or applied for (`SELF_APPROVAL_NOT_ALLOWED`). Only customers own bank accounts, but keep this guard generic and tested anyway.
- **Customer status:** an `inactive` customer can sign in and view data but can't start transfers, requests, loan applications, or repayments (`CUSTOMER_INACTIVE`). Customers whose KYC isn't `verified` can't hold accounts (`KYC_REQUIRED`).
- Put the matrix in `src/server/auth/guards.ts` as small functions (`assertRole`, `assertOwnsAccount`, `assertNotSelf`, `assertWithinApprovalLimit`) and unit-test them.

### 5.5 Security checklist (all required)

- Server-side balance validation and conditional updates. Never trust a balance, fee, or status sent by the client. The client sends amounts as decimal strings, and the server parses them into integer paisa.
- Atomic money movement: one MongoDB transaction per operation, with balanced ledger entries (§6).
- Account ownership verified on every customer request.
- Transaction PIN: scrypt hash with a random salt, constant-time comparison, lockout after 5 failures for 15 minutes (§8.2).
- Duplicate prevention: an `Idempotency-Key` header on every money-moving POST, a unique index, and a soft duplicate check (§8.3).
- Rate limits, stored in a MongoDB `rateLimits` collection with a TTL index, keyed by user:
  - transfers 10/min, loan repayments 10/min;
  - account lookup 30/min;
  - PIN set/change 5/hour;
  - loan applications 5/day;
  - deposit/withdrawal requests 20/day.
- Origin check on mutating requests (§5.2). Better Auth protects its own endpoints.
- Security headers in `next.config.ts`:
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and `Strict-Transport-Security` in production.
  - A Content-Security-Policy that keeps the app working (fonts are self-hosted by `next/font`). If a directive has to be relaxed, note why in DECISIONS.md.
- Never log passwords, PINs, session tokens, or full request bodies of auth routes.
- Append-only ledger entries and audit logs. Mongoose `pre` hooks throw on update or delete operations for those models.
- `.env*.local` stays in `.gitignore`. `.env.example` documents every variable.

---

## 6. Money, ledger, and invariants

### 6.1 Representation

- Every amount is stored and computed as an **integer number of paisa** (1 taka = 100 paisa) in fields ending in `Minor` (`amountMinor`, `balanceMinor`).
- `toMinor("1234.50")` returns `123450`. It accepts only `^\d{1,10}(\.\d{1,2})?$`, rejects zero, negatives, and more than two decimals, and never uses floating-point math on money. `fromMinor` exists only for display.
- Interest calculations may use floats internally but must round to whole paisa at every stored step (§8.6).

### 6.2 Accounts and double entry

- Bank accounts are either `kind: "customer"` or `kind: "system"`.
- Three system accounts are created idempotently at startup by the seed and by `ensureSystemAccounts()`:
  - `CASH_CLEARING`: the counterparty for deposits and withdrawals.
  - `LOAN_PORTFOLIO`: the counterparty for loan disbursements and repayments.
  - `FEE_INCOME`: receives transfer fees.
- System accounts may go negative, are hidden from customers, can't be transfer recipients, and are excluded from customer-facing statistics.
- **Every money movement is one `Transaction` document plus two or more immutable `LedgerEntry` documents, written in a single MongoDB transaction.** Each entry records its account, direction (`debit` = money leaves that account, `credit` = money enters it), a positive `amountMinor`, and `balanceAfterMinor`.

| Operation | Debit | Credit |
|---|---|---|
| Transfer (amount A, fee F) | sender A+F | receiver A; FEE_INCOME F (if F > 0) |
| Deposit approved | CASH_CLEARING A | customer A |
| Withdrawal approved | customer A | CASH_CLEARING A |
| Loan disbursed | LOAN_PORTFOLIO A | customer A |
| Loan repayment | customer A | LOAN_PORTFOLIO A |
| Reversal of a transfer | receiver A; FEE_INCOME F | sender A+F |

### 6.3 Holds and available balance

- `availableMinor = balanceMinor − holdMinor`.
- A hold reserves money without moving it. Pending withdrawal requests and transfers held for review place holds. Approving converts the hold into a debit; rejecting releases it.
- Every spending check uses available balance and keeps `minimumBalanceMinor` intact: `available − (amount + fee) ≥ minimumBalance`.

### 6.4 Invariants (tested, and checked by `npm run verify:ledger`)

1. For every transaction: Σ debit entries = Σ credit entries.
2. For every account: `balanceMinor` = Σ credits − Σ debits over its ledger entries.
3. For every customer account: `balanceMinor ≥ 0` and `holdMinor ≥ 0`, and `holdMinor` equals the sum of its open holds (pending withdrawal requests plus pending held transfers).
4. Every `completed` deposit, withdrawal, transfer, disbursement, or repayment has ledger entries. `failed` and `pending` transactions have none.
5. The ledger entries of a `reversed` transaction net to zero for each account.

`scripts/verify-ledger.ts` checks all five against the database and prints a pass/fail report (exit code 1 on failure). Admins can also run the same check from the admin dashboard (§8.8).

---

## 7. Data model

Better Auth owns `user`, `session`, `account`, `verification` (plus the `rateLimit` collection when database rate limiting is on). The admin plugin adds `role`, `banned`, `banReason`, and `banExpires` to users. App code reads Better Auth's user collection through a read-only Mongoose model (`strict: false`) for searches and stats, and changes users only through Better Auth APIs.

The PRD's suggested collections (Users, Accounts, Transactions, DepositWithdrawalRequests, Loans, Notifications) map to the collections below. The extra collections (`ledgerEntries`, `customerProfiles`, `auditLogs`, `bankSettings`, `counters`, `rateLimits`) are needed for consistency and security; document them in the README.

**customerProfiles**
- `userId` (unique), `phone`, `address`, `dateOfBirth`, `occupation`
- `kycStatus` (`pending | verified | rejected`), `kycNote`, `kycReviewedBy`, `kycReviewedAt`
- `status` (`active | inactive`), `statusReason`
- `pin { hash, setAt, failedAttempts, lockedUntil }` with `select: false`
- `registeredBy` (staff user ID or null), timestamps

**bankAccounts**
- `accountNumber` (unique, 12 digits)
- `kind` (`customer | system`), `systemCode` (unique, sparse)
- `ownerId` (null for system accounts)
- `type` (`savings | current | business`), `nickname`, `currency: "BDT"`
- `balanceMinor` (int), `holdMinor` (int)
- `status` (`active | frozen | closed`), `statusReason`, `statusChangedBy`, `statusChangedAt`
- `limits { perTransactionMinor, dailyTransferMinor, minimumBalanceMinor }`
- `dailyOutflow { date: "YYYY-MM-DD" (Asia/Dhaka), amountMinor }`
- `openedBy`, timestamps
- Indexes: `accountNumber`, `ownerId`, `status`, `type`.

**transactions**
- `reference` (unique, e.g. `TXN-261122-7Q2M9X`)
- `type` (`deposit | withdrawal | transfer | loan_disbursement | loan_repayment`)
- `status` (`pending | completed | failed | reversed`)
- `amountMinor`, `feeMinor`
- `fromAccountId`, `toAccountId`, plus denormalized `fromAccountNumber`, `toAccountNumber`, `fromOwnerId`, `toOwnerId`
- `initiatedBy`, `initiatedByRole`, `description`
- `idempotencyKey`, `requestHash`, `requestId`, `loanId`
- `failureCode`, `failureReason`
- `review { required, reason, reviewedBy, reviewedAt, decision, note }`
- `flags[] { source: rule | staff, rule, severity: medium | high, reason, raisedBy, raisedAt, status: open | cleared | actioned, resolvedBy, resolvedAt, resolution }`, plus `flagStatus` (`none | open | resolved`)
- `reversal { by, at, reason }`, `completedAt`, `createdAt`
- Indexes: `reference` (unique); `{ initiatedBy, idempotencyKey }` (unique, partial where the key exists); `{ fromAccountId, createdAt }`; `{ toAccountId, createdAt }`; `status`; `type`; `flagStatus`; `createdAt`.

**ledgerEntries** (append-only)
- `transactionId`, `accountId`, `direction` (`debit | credit`), `amountMinor`, `balanceAfterMinor`, `entryType` (`principal | fee | reversal`), `createdAt`
- Indexes: `{ accountId, createdAt }`, `transactionId`.

**depositWithdrawalRequests**
- `kind` (`deposit | withdrawal`), `accountId`, `customerId`, `amountMinor`, `description`
- `status` (`pending | approved | rejected`), `holdMinor`
- `reviewedBy`, `reviewedAt`, `reviewNote`, `rejectionReason`, `transactionId`
- `requestDate` (server time at creation)
- Indexes: `{ status, createdAt }`, `customerId`, `accountId`.

**loans**
- `applicantId`, `loanType` (`personal | home | car | education | business`)
- `principalMinor`, `durationMonths`, `annualRateBps` (1200 = 12.00%)
- `monthlyIncomeMinor`, `employmentStatus` (`salaried | self_employed | business_owner | student | retired | unemployed`), `description`, `disbursementAccountId`
- `status` (`pending | under_review | approved | rejected | active | completed`)
- `emiMinor`, `totalInterestMinor`, `totalPayableMinor`, `outstandingMinor`, `debtToIncome`
- `schedule[] { n, dueDate, principalMinor, interestMinor, amountDueMinor, status: due | paid, paidAt, transactionId }`
- `repayments[] { transactionId, amountMinor, installments: number[], paidAt }`
- `notes[] { authorId, authorRole, body, createdAt }` (internal only)
- `forwarded { by, at, recommendation: approve | reject, note }`
- `decision { by, at, reason }`, `disbursement { by, at, transactionId }`, `completedAt`, timestamps
- Indexes: `applicantId`, `{ status, createdAt }`.

**notifications**
- `userId`, `type`, `title`, `body`, `link`, `readAt`, `createdAt`
- Indexes: `{ userId, readAt, createdAt }`.

**auditLogs** (append-only)
- `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `summary`, `before`, `after`, `reason`, `ip`, `userAgent`, `createdAt`

**bankSettings** (singleton `key: "default"`)
- Default limits per account type, `transferFeeMinor`, `reviewThresholdMinor`, `staffApprovalLimitMinor`
- `loanProducts { [type]: { annualRateBps, minMonths, maxMonths, maxPrincipalMinor } }`
- `risk { highValueMinor, velocityCount, velocityWindowMinutes, newPayeeRatio, newPayeeMinMinor, oddHoursStart, oddHoursEnd, oddHoursMinMinor }`
- `updatedBy`, `updatedAt`

**counters**: `{ _id: "accountNumber", seq }`.

**rateLimits**: `{ key, count, windowStart, expiresAt }` with a TTL index on `expiresAt`.

**Identifiers** (`src/lib/ids.ts`, unit-tested):
- **Account number:** 12 digits = branch `11` + type code (`10` savings, `20` current, `30` business) + a 7-digit sequence from `counters` (atomic `$inc`, upsert) + a Luhn check digit. Display it grouped in fours.
- **Transaction reference:** `TXN-YYMMDD-` + 6 random Crockford base32 characters (from `crypto.randomBytes`). Retry on a duplicate-key error.

---

## 8. Business workflows

Implement each workflow as a service function in `src/server/services/*` that takes an `actor` (`{ id, role }`) and an optional `clock` (used only by the seed script to backdate history). Write the service and its tests first, then the route, then the UI.

### 8.1 Registration, KYC, account opening

1. **Self-registration (public `/register`):** Better Auth sign-up creates the user with role `customer`, and the after-create hook creates their profile with `kycStatus: "pending"`. The dashboard then shows: "We're verifying your details. A staff member will open your first account."
2. **Staff/admin register a customer:** `POST /api/customers`. Staff/admin enter the profile details and a generated temporary password, which is shown once with a copy button. The route calls `auth.api.createUser` with `role: "customer"` and the caller's headers, then completes the profile. If the profile step fails, delete the created user (compensate) and return an error.
3. **KYC review:** `POST /api/customers/:id/kyc` with `{ decision: "verified" | "rejected", note }`. Notify the customer and write an audit entry.
4. **Open an account:** `POST /api/accounts` with `{ customerId, type, nickname? }`. The customer must be KYC-verified and active. The new account gets a generated number, the account type's default limits, and a zero balance. Notify the customer and write an audit entry.

### 8.2 Transaction PIN

- Customers must set a 4–6 digit PIN before their first transfer or repayment (`POST /api/me/pin`, only when none exists). They can change it with the current PIN (`PUT /api/me/pin`). Reject PINs with one repeated digit ("1111"). Show a non-blocking hint for sequences like "1234".
- Hash: `crypto.scrypt` with a 16-byte random salt and a 64-byte key, stored as `scrypt$<salt>$<hash>`. Verify with `timingSafeEqual`.
- Verification:
  - If `lockedUntil` is in the future, return `PIN_LOCKED` with the unlock time.
  - On a wrong PIN, atomically increment `failedAttempts`. At 5, set `lockedUntil` to now + 15 minutes and write an audit entry (`PIN_LOCKED`). Return `INVALID_PIN` with the attempts remaining.
  - On a correct PIN, reset the counter.
- PIN verification happens before the money transaction starts and is never logged.

### 8.3 Fund transfers (PRD §5.3)

`POST /api/transfers`. Role: customer. Header `Idempotency-Key` (UUID) is required.

Body: `{ fromAccountId, toAccountNumber, amount: "1500.00", description?: string (≤ 140), pin, confirmDuplicate?: boolean }`. Strip spaces from the account number before validating its 12 digits.

Algorithm:

```
1. Validate input. amountMinor = toMinor(amount).
2. Check the profile: status active (CUSTOMER_INACTIVE), KYC verified (KYC_REQUIRED), PIN set (PIN_NOT_SET).
3. Verify the PIN (§8.2).
4. requestHash = sha256(fromAccountId | toAccountNumber | amountMinor | description).
   Idempotency fast path: look up { initiatedBy: actor.id, idempotencyKey }.
     Same hash  → return 200 with that transaction and header Idempotent-Replay: true.
     Other hash → 409 IDEMPOTENCY_KEY_REUSED.
5. Soft duplicate check: if a completed transfer with the same from/to/amount exists in the last
   2 minutes and confirmDuplicate isn't true → 409 POSSIBLE_DUPLICATE (details: time of the earlier
   one). The UI asks "You sent ৳X to this account 1 minute ago. Send it again?"
6. runInTransaction(session =>
     sender   = account by id AND ownerId = actor.id        (not found → NOT_FOUND)
     sender.status must be active                          (ACCOUNT_NOT_ACTIVE)
     receiver = customer account by accountNumber          (not found → RECIPIENT_NOT_FOUND)
     receiver.status must be active                        (RECIPIENT_NOT_ACTIVE)
     receiver ≠ sender                                     (SAME_ACCOUNT)
     settings = bank settings (in session)
     ownTransfer = receiver.ownerId == actor.id
     fee   = ownTransfer ? 0 : settings.transferFeeMinor
     total = amountMinor + fee
     amountMinor ≤ sender.limits.perTransactionMinor       (LIMIT_PER_TRANSACTION)
     today = Asia/Dhaka date key
     outflowToday = sender.dailyOutflow.date == today ? sender.dailyOutflow.amountMinor : 0
     outflowToday + amountMinor ≤ sender.limits.dailyTransferMinor   (LIMIT_DAILY, details: remaining)
     available − total ≥ sender.limits.minimumBalanceMinor           (INSUFFICIENT_FUNDS, details: max sendable)
     risk = evaluateRisk(...) unless ownTransfer          (§8.7)
     needsReview = !ownTransfer && (amountMinor ≥ settings.reviewThresholdMinor || risk.severity == "high")

     if needsReview:
       create Transaction { status: "pending", review: { required: true, reason }, flags, idempotencyKey, requestHash, ... }
       update sender (guarded filter: _id, status active, available ≥ total + minimumBalance):
         $inc holdMinor +total; set dailyOutflow
       guarded update matched 0 → throw CONFLICT (concurrent change)
       notification to sender: transfer pending review; audit TRANSFER_HELD
     else:
       create Transaction { status: "completed", completedAt, flags, ... }
       update sender   with the guard above: $inc balanceMinor −total; set dailyOutflow
       update receiver (guard: status active): $inc balanceMinor +amountMinor
       update FEE_INCOME: $inc +fee (only if fee > 0)
       insert ledger entries in order (each with balanceAfterMinor from the updated docs)
       assert Σdebit == Σcredit, else throw
       notifications: sender "Transfer completed", receiver "Money received"
       if flags exist: notify admins (FLAG_RAISED)
     return the transaction
   )
7. A duplicate-key error on the idempotency index means another request won the race:
   fetch that transaction and return it as in step 4.
8. Business-rule failures from step 6 (INSUFFICIENT_FUNDS, LIMIT_*, RECIPIENT_NOT_ACTIVE,
   ACCOUNT_NOT_ACTIVE): after the transaction aborts, record a separate Transaction
   { status: "failed", failureCode, failureReason } with NO ledger entries and NO idempotency key,
   so the customer can retry after fixing the problem. Then return the error.
   Validation errors, PIN errors, and not-found errors aren't recorded as transactions.
9. Respond 201 with the transaction DTO.
```

Why this is safe under concurrency: both reads and writes of the sender account happen inside one snapshot transaction. If two transfers race on the same account, MongoDB raises a write conflict for one of them, and `withTransaction` retries it against fresh data. The guarded update filters are a second line of defense. The concurrency test in §13 proves it.

**Transfer UI:**
1. Form: the from account (defaults to the switcher's selection), the recipient account number with a live lookup (`GET /api/accounts/lookup?number=` returns a masked holder name like "Ra*** Ud***", the account type, and `isOwn`; rate-limited), quick-pick chips for the customer's own other accounts, the amount (with available balance and remaining daily limit shown under the field), and the description.
2. Review dialog: from, to (masked name), amount, fee, total, balance after, the PIN input, and a lime "Send money" button. Generate the `Idempotency-Key` with `crypto.randomUUID()` when the dialog opens, and reuse it if the same submission is retried.
3. Result screen: the reference, time, and status (completed, or "Held for review"), with buttons to view the receipt, download the PDF, and make another transfer.

### 8.4 Held transfers (review queue)

- `POST /api/transactions/:id/review` with `{ decision: "approve" | "reject", note }`. Staff (up to `staffApprovalLimitMinor`) or admin. The reviewer can't be the initiator.
- **Approve** (in one transaction): the transaction must still be `pending` (otherwise `CONFLICT`); the receiver must still be active (otherwise `RECIPIENT_NOT_ACTIVE`, and the reviewer can reject instead). Convert the hold: sender `$inc { holdMinor: −total, balanceMinor: −total }` (guarded so `holdMinor ≥ total`), credit the receiver and FEE_INCOME, write the ledger entries, set the status to `completed`, notify both parties, and write an audit entry.
- **Reject:** release the hold, reduce `dailyOutflow` if it's still the same day, set the status to `failed` with `failureCode: "REJECTED_BY_REVIEW"`, notify the sender, and write an audit entry.

### 8.5 Deposit and withdrawal requests (PRD §5.4)

- `POST /api/requests` with `{ kind, accountId, amount, description? }`. Customers only, on their own active accounts. `requestDate` is set by the server.
  - **Deposit:** no hold.
  - **Withdrawal:** check `amountMinor ≤ perTransactionMinor`, then place a hold in a transaction (guarded: `available − amount ≥ minimumBalance`). The held money can't be spent by transfers.
- `POST /api/requests/:id/approve` with `{ note? }`. Staff (up to the approval limit) or admin, never the requester, and the account must be active. In one transaction: create a completed Transaction (`deposit` or `withdrawal`), move the money (a withdrawal converts its hold), write the ledger entries, set the request to `approved` with `transactionId`, notify the customer, and write an audit entry.
- `POST /api/requests/:id/reject` with `{ reason }` (5–300 characters). Release any hold, set `rejected`, notify the customer, and write an audit entry.
- Customer UI: a request form, plus a requests list with status badges and the request date. Staff/admin UI: a queue filtered by status and kind, with approve/reject confirmation dialogs. Amounts above the staff limit show "Needs admin approval" to staff.

### 8.6 Loans (PRD §5.6)

**Products and rates** come from `bankSettings.loanProducts`. Defaults:

| Type | Rate | Term (months) | Max principal |
|---|---|---|---|
| Personal | 12.00% | 6–60 | ৳10,00,000 |
| Home | 9.00% | 12–240 | ৳1,00,00,000 |
| Car | 10.50% | 12–84 | ৳30,00,000 |
| Education | 8.00% | 6–84 | ৳15,00,000 |
| Business | 13.00% | 6–60 | ৳50,00,000 |

**EMI** (`src/lib/emi.ts`, pure and unit-tested). Monthly rate r = annualRateBps / 10000 / 12.
- EMI = P·r·(1+r)^n / ((1+r)^n − 1), or P / n when r = 0, rounded to whole paisa.
- Build the schedule month by month: `interest = round(balance × r)`, `principal = emi − interest`. The last installment takes the exact remaining principal.
- The principal components must add up to P exactly.

**Application:** `POST /api/loans` with `{ loanType, amount, durationMonths, monthlyIncome, employmentStatus, description (20–500), disbursementAccountId }`.
- The customer must be active and KYC-verified, and the disbursement account must be their own active account.
- Validate the amount and term against the product.
- Store `debtToIncome = emi / monthlyIncome`.
- The form shows a live EMI preview (EMI, total interest, total payable) and a debt-to-income indicator: up to 35% good, up to 50% moderate, above 50% high.

**Status flow:**
- **pending:** submitted. Staff and admin can add internal notes (`POST /api/loans/:id/notes`).
- **under_review:** staff forwarded it to an admin (`POST /api/loans/:id/forward` with `{ recommendation, note }`). Notify admins.
- **approved:** admin approved it (`POST /api/loans/:id/approve`), from pending or under_review. This locks `annualRateBps` from current settings and computes the EMI and totals.
- **rejected:** admin rejected it (`POST /api/loans/:id/reject` with `{ reason }`), from pending, under_review, or approved.
- **active:** admin disbursed it (`POST /api/loans/:id/disburse`), from approved only. In one transaction: create the completed `loan_disbursement` Transaction, credit the disbursement account and debit LOAN_PORTFOLIO, write the ledger entries, generate the schedule (first due date one month after disbursement), and set `outstandingMinor`. The account must still be active. A second disburse call sees the status `active` and fails with `INVALID_STATE`.
- **completed:** set automatically when the last installment is paid.
- Only admins approve, reject, and disburse. Staff restriction (PRD §4.2): nobody acts on a loan they applied for.

**Repayment:** `POST /api/loans/:id/repay` with `{ fromAccountId, pin, mode: "next_installment" | "payoff" }` and an `Idempotency-Key`.
- `next_installment` pays the earliest unpaid installment's `amountDueMinor`.
- `payoff` pays the remaining principal of all unpaid installments, with no future interest.
- In one transaction: debit the account (available-balance guard), credit LOAN_PORTFOLIO, write the ledger entries, mark the installments paid with `transactionId`, push to `repayments`, update `outstandingMinor`, set `completed` if nothing is left, notify the customer, and write an audit entry.
- Installments past their due date and unpaid show as Overdue (computed when read; no penalties).

**Loan detail page:**
- Customers see the terms, status timeline, repayment schedule, remaining balance, a progress bar, repayment history, and "Pay next installment" (lime).
- Staff and admin also see the applicant profile, income, debt-to-income, internal notes, and the review history.

### 8.7 Suspicious activity, flags, reversals (PRD bonus §9.6)

`evaluateRisk` in `src/server/services/risk.ts` uses thresholds from settings, skips transfers between a customer's own accounts, and returns flags:

| Rule | Default condition | Severity |
|---|---|---|
| `high_value` | amount ≥ ৳2,00,000 | medium |
| `velocity` | more than 5 outgoing transfers from the account in 10 minutes | high (hold) |
| `new_payee_large` | first transfer to this recipient, ≥ 50% of available balance and ≥ ৳50,000 | medium |
| `odd_hours` | 00:00–05:00 Asia/Dhaka and ≥ ৳50,000 | medium |

- Medium flags let the transfer complete with `flagStatus: "open"` for admin review. High flags hold the transfer (§8.4).
- Staff can flag any transaction manually: `POST /api/transactions/:id/flag` with `{ reason }`. This notifies admins and writes an audit entry.
- Admin resolves flags with `POST /api/transactions/:id/flags/resolve` and `{ action: "clear" | "reverse" | "freeze_sender", note }`:
  - **clear** marks the flags cleared.
  - **reverse** (completed transfers only), in one transaction: the receiver needs `available ≥ amount` (otherwise `REVERSAL_INSUFFICIENT_FUNDS`, and the UI suggests freezing instead). Write compensating ledger entries (§6.2), refund the fee, set the status to `reversed` with `reversal`, notify both parties, and write an audit entry.
  - **freeze_sender** freezes the sender's account (§8.8).

### 8.8 Account and customer administration

- **Freeze/unfreeze** (admin): `POST /api/accounts/:id/freeze` with `{ reason }`, and `.../unfreeze`. A frozen account can't send or receive transfers. Its pending requests can't be approved until it's unfrozen, and loan disbursements or repayments that involve it are blocked. Customers see a banner on that account.
- **Limits** (admin): `PATCH /api/accounts/:id/limits` with taka strings for per-transaction, daily, and minimum balance. The minimum balance can't exceed the current balance unless the admin confirms.
- **Update account info** (admin): `PATCH /api/accounts/:id` with `{ nickname }`. The type is fixed after opening; record that in DECISIONS.md.
- **Customer status** (admin): `PATCH /api/customers/:id/status` with `{ status: "active" | "inactive", reason }`.
- **Block/unblock** (admin): `POST /api/customers/:id/block` with `{ reason, freezeAccounts: boolean }` (default `true`). This calls the Better Auth `banUser` API, and `unbanUser` to unblock.
- **Integrity check** (admin): `POST /api/admin/integrity-check` runs the §6.4 checks and returns the report. It's shown as an "Integrity check" card on the admin dashboard with the last result and a "Run check" button.
- Every action here writes an audit entry with the reason.

### 8.9 Bank settings (admin only)

`GET /api/admin/settings` and `PUT /api/admin/settings` (validated, audited with before/after). Defaults live in `src/server/services/settings.ts` and are seeded:

| Setting | Savings | Current | Business |
|---|---|---|---|
| Minimum balance | ৳500 | ৳1,000 | ৳5,000 |
| Max single transaction | ৳1,00,000 | ৳5,00,000 | ৳20,00,000 |
| Daily transfer limit | ৳2,00,000 | ৳10,00,000 | ৳50,00,000 |

Also:
- Transfer fee to other customers: ৳10 (own-account transfers are free).
- Review threshold: ৳5,00,000.
- Staff approval limit: ৳5,00,000.
- Loan products: §8.6. Risk thresholds: §8.7.

Changing defaults affects new accounts only. Per-account limits change through §8.8. Staff can view settings but never edit them (PRD §4.2).

### 8.10 Notifications (PRD bonus §9.2)

- Notifications are written inside the same database transaction as the event that caused them.
- Types: transfer sent, money received, transfer held/released/rejected, deposit approved/rejected, withdrawal approved/rejected, KYC verified/rejected, account opened/frozen/unfrozen, loan submitted/approved/rejected/disbursed/repayment received/completed, transaction reversed. Admins also get flag raised and loan forwarded.
- UI: a bell with an unread count (RTK Query polling every 30 seconds plus refetch on focus), a popover with the latest 10, a full page with a read/unread filter, and "Mark all as read" (`POST /api/notifications/read` with `{ ids } | { all: true }`).

### 8.11 Statements and receipts (PRD §5.5, bonus §9.1, §9.4)

- **On-screen receipt:** `/customer/transactions/[id]` (and the equivalent staff/admin views) shows the reference, date and time (Asia/Dhaka), type, status, from and to (masked for customers), amount, fee, total, and description, with a "Print" button and a print stylesheet.
- **PDF receipt:** `GET /api/transactions/:id/receipt` (pdf-lib, A4, Helvetica, "BDT" amounts). It includes the bank name, the reference, all the fields above, a generated-at time, and the line "Simulated transaction — no real money moved."
- **Statements:** `GET /api/accounts/:id/statement?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|pdf`, covering at most 366 days.
  - Header: bank, customer, account number and type, period, opening balance (`balanceAfterMinor` of the last entry before `from`), closing balance, total debits, total credits.
  - Columns: Date, Reference, Description, Type, Debit (BDT), Credit (BDT), Balance (BDT).
  - CSV: UTF-8 with a BOM, RFC 4180 quoting, plain decimal amounts.
  - PDF: paged, with page numbers.
- Customers can only download their own documents. Staff and admin can download any.

### 8.12 Audit log

Write an audit entry (inside the same transaction) for every staff and admin action and for security events: customer registered by staff, KYC decided, account opened/updated/frozen/unfrozen, limits changed, customer activated/deactivated/blocked/unblocked, request approved/rejected, transfer held/reviewed, transaction flagged, flag resolved, transaction reversed, loan note/forward/approve/reject/disburse, settings updated, staff created, PIN set/changed/locked, integrity check run.

Admins can view the log at `/admin/audit-log`, with filters by action, actor, and date.

---

## 9. API reference

All routes live under `src/app/api/…` and use `withHandler`. Role names in brackets.

**Me**
- `GET /api/me` — user, role, and (for customers) profile summary: KYC status, customer status, whether a PIN is set.
- `PATCH /api/me/profile` [customer] — phone, address.
- `POST /api/me/pin`, `PUT /api/me/pin` [customer].

**Accounts**
- `GET /api/accounts` — customers get their own; staff/admin can filter by `customerId`, `type`, `status`, `q`.
- `POST /api/accounts` [staff, admin].
- `GET /api/accounts/lookup?number=` [customer].
- `GET /api/accounts/:id` — includes `availableMinor` and `holdMinor`.
- `GET /api/accounts/:id/balance-history?days=90` — daily closing balances from the ledger, for the balance chart.
- `PATCH /api/accounts/:id`, `PATCH /api/accounts/:id/limits` [admin].
- `POST /api/accounts/:id/freeze`, `POST /api/accounts/:id/unfreeze` [admin].
- `GET /api/accounts/:id/statement` — §8.11.

**Transfers and transactions**
- `POST /api/transfers` [customer].
- `GET /api/transactions` — filters: `accountId`, `customerId` (staff/admin), `type`, `status`, `flagStatus`, `from`, `to`, `q` (reference or account number), plus pagination. Customers only ever see transactions that touch their own accounts.
- `GET /api/transactions/:idOrReference`.
- `GET /api/transactions/:id/receipt`.
- `POST /api/transactions/:id/review` [staff, admin].
- `POST /api/transactions/:id/flag` [staff, admin].
- `POST /api/transactions/:id/flags/resolve` [admin].

**Deposit and withdrawal requests**
- `GET /api/requests`, `POST /api/requests` [customer].
- `POST /api/requests/:id/approve`, `POST /api/requests/:id/reject` [staff, admin].

**Loans**
- `GET /api/loans/products`.
- `GET /api/loans`, `POST /api/loans` [customer].
- `GET /api/loans/:id`.
- `POST /api/loans/:id/notes`, `POST /api/loans/:id/forward` [staff, admin].
- `POST /api/loans/:id/approve`, `/reject`, `/disburse` [admin].
- `POST /api/loans/:id/repay` [customer].

**Customers**
- `GET /api/customers` [staff, admin] — search by name, email, phone, or account number; filter by KYC and status.
- `POST /api/customers` [staff, admin].
- `GET /api/customers/:id` [staff, admin] — profile, accounts, recent transactions, loans.
- `POST /api/customers/:id/kyc` [staff, admin].
- `PATCH /api/customers/:id/status`, `POST /api/customers/:id/block`, `POST /api/customers/:id/unblock` [admin].

**Notifications**
- `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/read`.

**Stats** (§12)
- `GET /api/stats/admin` [admin].
- `GET /api/stats/staff` [staff, admin].
- `GET /api/stats/customer?accountId=` [customer].

**Admin**
- `GET /api/admin/settings` [staff, admin], `PUT /api/admin/settings` [admin].
- `GET /api/admin/staff`, `POST /api/admin/staff` [admin].
- `GET /api/admin/audit-logs` [admin].
- `POST /api/admin/integrity-check` [admin].

---

## 10. Redux Toolkit and RTK Query (PRD §6)

Server data lives in RTK Query's cache. Client state lives in feature slices. Never copy server data into slices.

**Store** (`src/store/store.ts`)
- `makeStore(preloadedState)` with `configureStore`.
- Reducers: `api` (RTK Query), `auth`, `ui`, `accounts`, `transactions`, `loans`.
- Middleware: `getDefaultMiddleware().concat(baseApi.middleware, errorMiddleware, listenerMiddleware)`.
- Typed hooks in `src/store/hooks.ts`: `useAppDispatch`, `useAppSelector`.

**Provider**
- `StoreProvider` is a client component. It creates the store once (`useRef`) with the server-loaded session user as preloaded `auth` state, and calls `setupListeners(store.dispatch)`.
- Role layouts pass the user from `auth.api.getSession` into it.

**Base API** (`src/store/baseApi.ts`)
- `createApi({ reducerPath: "api", baseQuery, tagTypes, endpoints: () => ({}) })`.
- `baseQuery` wraps `fetchBaseQuery({ baseUrl: "/api" })` and normalizes every error to `ApiError { status, code, message, fieldErrors?, details? }`.
- Tag types: `Me`, `Account`, `Transaction`, `Request`, `Loan`, `Notification`, `Customer`, `Stats`, `Settings`, `AuditLog`.
- Each feature's `api.ts` uses `baseApi.injectEndpoints`, with `providesTags` on queries (item IDs plus a `LIST` tag) and precise `invalidatesTags` on mutations. Examples:
  - A transfer invalidates both accounts, the transaction list, `Stats`, and `Notification`.
  - Approving a request invalidates `Request`, `Account`, `Transaction`, and `Stats`.

**Slices**
- `auth`: the session user `{ id, name, email, role }` and `status`. A `signedOut` action resets the whole store (root reducer) and calls `baseApi.util.resetApiState()`.
- `accounts`: `selectedAccountId` for the account switcher, persisted to `localStorage` by a listener (wrapped in try/catch).
- `transactions`: filters `{ q, type, status, from, to, accountId }`, `page`, `pageSize`. The transactions page builds its query arguments from these.
- `loans`: list filters and the EMI calculator inputs used by the apply form preview.
- `ui`: `pendingRequests` (centralized loading state), `sidebarOpen`, `mobileNavOpen`.

**Centralized loading.** `ui.pendingRequests` increments and decrements through `extraReducers` matchers (`isPending`, `isFulfilled`, `isRejected` on the API's thunks). A thin top progress bar shows while it's above 0, after a 150ms delay to avoid flicker. Individual components still show skeletons from each query's own `isLoading`.

**Centralized errors.** `errorMiddleware` catches `isRejectedWithValue` actions:
- 401 → dispatch `signedOut` and redirect to `/login`.
- 403 → toast "You don't have access to that."
- Failed queries and 5xx errors → toast the normalized message.
- 409/422 errors from mutations aren't toasted. Forms handle them inline: map `fieldErrors` to `setError` and show business errors (`INSUFFICIENT_FUNDS` etc.) in an inline alert.

Document this architecture in the README with a small diagram.

---

## 11. Frontend routes and pages

Every page has a loading skeleton, an empty state, and an error state with a retry. Add `error.tsx` and `not-found.tsx` per segment. Every destructive or money-moving action goes through `ConfirmDialog`. Reject dialogs require a reason.

**Public**
- `/` — landing (§3.8).
- `/login` — email and password. Generic error: "Email or password is incorrect." When `NEXT_PUBLIC_SHOW_DEMO_LOGINS=true`, a "Try a demo account" row of chips fills in the demo credentials (it doesn't sign in automatically). After sign-in, redirect by role (or to `next`).
- `/register` — name, email, phone (Bangladesh format `01XXXXXXXXX`, optional `+880`), password (8+ characters with letters and numbers), confirm password, and a required checkbox "I understand Bhorsa is a simulated bank."

**Customer** (`/customer`)
- `/customer` — statement card; stat cards for total deposits, total withdrawals, and active loans (count and outstanding); charts for monthly spending, monthly deposits, and transaction distribution; recent transactions (8); account information panel. Scope: the selected account, with an "All accounts" option.
- `/customer/accounts` — account cards (type, nickname, masked number, balance, status), plus a balance-history line chart for the selected account.
- `/customer/accounts/[id]` — details, limits and today's remaining limit, holds, statement download (date range plus CSV/PDF).
- `/customer/transfer` — §8.3.
- `/customer/transactions` and `/customer/transactions/[id]` — filter bar (search by reference, type, status, date range with presets: 7 days, 30 days, this month, custom), day-grouped list, pagination, receipt view.
- `/customer/requests` — new request form plus history.
- `/customer/loans`, `/customer/loans/apply`, `/customer/loans/[id]`.
- `/customer/notifications`.
- `/customer/settings` — profile, change password (Better Auth), set/change PIN, theme, and 2FA if built.

**Staff** (`/staff`)
- `/staff` — work queues: KYC pending, pending requests, held transfers, open flags, loans awaiting review. Each shows a count and a "Review" link. Below them, recent activity.
- `/staff/customers`, `/staff/customers/new`, `/staff/customers/[id]` — search, register, profile with tabs for accounts, transactions, and loans; KYC review; open account.
- `/staff/transactions` and `/staff/transactions/[id]` — search by reference, filter by date, type, and status; flag button.
- `/staff/queue` — tabs: requests, held transfers, flags.
- `/staff/loans` and `/staff/loans/[id]` — review, notes, forward.
- `/staff/settings` — read-only view of bank settings.

**Admin** (`/admin`)
- `/admin` — KPI cards, charts, "Needs attention" list, integrity check card.
- `/admin/customers` and `/admin/customers/[id]` — everything staff have, plus activate/deactivate, block/unblock, and transaction history.
- `/admin/accounts` and `/admin/accounts/[id]` — list, update, freeze, limits.
- `/admin/transactions` and `/admin/transactions/[id]` — plus resolve flags and reverse.
- `/admin/requests` — approve or reject requests at any amount.
- `/admin/loans` and `/admin/loans/[id]` — approve, reject, disburse, repayment history.
- `/admin/staff` — list and create staff users.
- `/admin/settings` — edit bank settings.
- `/admin/audit-log`.

**Forms** use React Hook Form with `zodResolver` and the shared schemas from `features/*/schemas.ts`. `AmountInput` accepts digits and one decimal point (up to 2 decimals), shows lakh grouping when the field loses focus, and submits a plain string. `PinInput` uses `inputMode="numeric"`, masked digits, and `autoComplete="off"`. Submit buttons show `isPending` and stay disabled until the request finishes.

---

## 12. Analytics endpoints (PRD §7)

Compute everything with MongoDB aggregation pipelines (`$match`, `$group`, `$dateTrunc` with `timezone: "Asia/Dhaka"`). Fill in months with no data as zero. The default range is the last 12 months, and every chart offers 6 and 12 month toggles.

**`/api/stats/admin`**
- Cards:
  - `totalCustomers`: users with role customer.
  - `totalAccounts`: customer accounts.
  - `totalBankBalance`: Σ customer balances.
  - `totalDeposits` and `totalWithdrawals`: Σ completed transactions of each type.
  - `totalTransactions`: count of completed transactions.
  - `pendingLoanApplications`: loans that are pending or under review.
- Series:
  - `monthlyTransactionVolume`: Σ completed amounts per month (bar).
  - `depositVsWithdrawal`: deposits and withdrawals per month (grouped bars, chart-1 and chart-2).
  - `accountDistribution`: count and balance by account type (horizontal bars).
  - `loanApprovalStats`: count by status plus the approval rate (status-colored bars).
  - `monthlyBankingActivity`: transaction count per month by type (stacked bars, chart-1…5).
- `needsAttention`: open flags, held transfers, requests above the staff limit, loans under review.

**`/api/stats/customer`** (scoped to the selected account or all of the customer's accounts)
- `totalBalance`, `totalDeposits`, `totalWithdrawals`, `activeLoans { count, outstandingMinor }`, `recentTransactions`.
- `monthlySpending`: Σ outgoing debits per month (withdrawals, transfers to other people, loan repayments, fees; transfers between the customer's own accounts are excluded).
- `monthlyDeposits`: Σ completed deposits per month.
- `transactionDistribution`: count by type over the period.

**`/api/stats/staff`**
- Counts for each work queue.

---

## 13. Testing

- Vitest. A `globalSetup` starts `MongoMemoryReplSet` (one member, wiredTiger) so transactions work, and sets `MONGODB_URI`.
- Integration tests call services directly, plus a few route handlers with a mocked session module.
- `npm run test` must pass in every phase gate.

**Unit tests**
- `toMinor` and `formatBDT`.
- Account number generation and Luhn validation; reference format.
- EMI schedule: the principal sums to P exactly, the last installment adjusts, and r = 0 works.
- Risk rules.
- Guards: approval limit, self-approval, ownership.
- PIN hashing and verification.

**Integration tests**
1. A completed transfer updates balances, writes balanced ledger entries, creates notifications, and updates `dailyOutflow`.
2. Insufficient funds produce a failed record with no ledger entries and unchanged balances. The minimum balance, per-transaction limit, and daily limit (across several transfers) are all enforced.
3. Frozen sender, frozen receiver, inactive customer, and unverified KYC are each rejected.
4. Wrong PIN: the counter increments, the 5th failure locks the PIN, and a correct PIN resets the counter.
5. An idempotent replay returns the same transaction. Reusing a key with a different payload returns 409. `POSSIBLE_DUPLICATE` fires within 2 minutes unless confirmed.
6. **Concurrency:** 10 parallel transfers of ৳100 from an account with exactly ৳500 available above its minimum. Exactly 5 complete, the final balance is correct, and the balance is never negative.
7. Held transfers: an amount at or above the threshold is held. Approving completes it, rejecting releases the hold, and the initiator can't review their own transfer.
8. Withdrawal requests: the hold blocks spending, approving converts it, rejecting releases it. The staff limit is enforced, while admins can approve above it.
9. Loans: apply → forward → approve → disburse (ledger written) → repay everything → completed. A second disburse fails. Staff can't approve, and nobody can act on their own loan.
10. Reversal, including the case where the receiver has insufficient funds.
11. The ledger invariant checker passes after a random sequence of 200 mixed operations.
12. Authorization: a customer can't read another customer's account or transactions (404); staff can't freeze (403); staff can't create an admin through `/api/auth/admin/create-user`.

---

## 14. Seed data and demo accounts

`npm run seed` (`tsx scripts/seed.ts`):
- Refuses to run unless `SEED_ALLOW_RESET=true`. It then clears app collections and Better Auth collections in the target database.
- Uses a fixed pseudo-random seed (for example mulberry32) so the demo data is the same on every run.
- Creates users through `auth.api.signUpEmail`, then sets roles and profile fields directly (the seed is trusted code).
- Creates all money history **through the real services**, passing a backdated `clock`, so balances, ledger entries, and charts are consistent.
- Runs the ledger verification (§6.4) at the end and fails loudly if anything is off.

Contents:
- **Admin:** Farhana Kabir — `admin@bhorsa.demo` / `Admin@1234`.
- **Staff:** Tanvir Ahmed — `staff@bhorsa.demo` / `Staff@1234`. A second staff user: Sadia Islam.
- **Demo customer:** Rahim Uddin — `customer@bhorsa.demo` / `Customer@1234`, transaction PIN `1234`. Savings and current accounts.
- **More customers**, all `Customer@1234`:
  - Nusrat Jahan (savings)
  - Arif Hossain (savings and business, "Padma Traders")
  - Mitu Akter (savings, **frozen**)
  - Karim Chowdhury (**inactive**)
  - Jannat Ara (**self-registered, KYC pending, no accounts**)
- **Six months of activity:** monthly salary deposits, everyday transfers between customers, own-account transfers, withdrawals, two failed attempts (insufficient funds, daily limit), one completed transfer with an open `high_value` flag, one transfer held for review, one reversed transfer.
- **Queues:** two pending deposit requests and one pending withdrawal request (with its hold).
- **Loans:**
  - Rahim: personal loan, active, 3 installments paid.
  - Nusrat: education loan, pending.
  - Arif: business loan, under review with a staff note and recommendation.
  - Karim: car loan, rejected.
  - Nusrat: personal loan, completed.
  - Arif: home loan, approved but not disbursed.
- Notifications that match the events above, and audit entries for every staff and admin action.

Put the demo credentials in the README and in the login page's demo chips.

---

## 15. Environment variables

`.env.example`:

```
MONGODB_URI=            # MongoDB Atlas connection string (replica set needed for transactions)
BETTER_AUTH_SECRET=     # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
TRUSTED_ORIGINS=        # optional, comma-separated (e.g. Vercel preview URLs)
NEXT_PUBLIC_SHOW_DEMO_LOGINS=true
SEED_ALLOW_RESET=false
```

Validate server environment variables at startup with Zod in `src/server/env.ts`. Fail fast with a clear message.

---

## 16. README and deployment (PRD §13)

`README.md` must include:
- Project overview and live URL placeholder.
- Features by role.
- User roles and permissions (the matrix from §5.4).
- Redux Toolkit architecture and RTK Query implementation: slices, tags, invalidation, loading, errors.
- Authentication strategy: Better Auth, admin plugin roles, session handling, server-side guards, proxy.
- Transaction processing logic: paisa integers, double entry, holds, the transfer algorithm, idempotency, concurrency, invariants. Include a Mermaid sequence diagram of a transfer.
- Database structure: every collection, its key fields and indexes, and why the extra collections exist.
- Security implementation: map each item in §5.5 to where it lives in the code.
- Design system summary (palette, type, status colors).
- Environment variables, local setup, seeding, tests, and the `verify:ledger` script.
- Deployment instructions and a demo credentials table for all three roles.
- A note that the app is a simulation.

**Scripts:**
- `dev`, `build`, `start`
- `lint` (`eslint .`), `typecheck` (`tsc --noEmit`)
- `test`
- `seed`, `ensure-indexes`, `verify:ledger`

**Deployment (Vercel):**
1. Create a free MongoDB Atlas cluster. Allow network access from `0.0.0.0/0` (acceptable for this demo; note it in the README).
2. Import the GitHub repo into Vercel and set every environment variable. `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` are the production URL.
3. Deploy.
4. Seed production from a local machine with the production `MONGODB_URI` and `SEED_ALLOW_RESET=true`, then run `npm run verify:ledger`.

---

## 17. Phase plan

The phases follow PRD §16. Copy every task into `PROGRESS.md` as a checkbox. Each phase ends with the phase gate (§0.3).

### Phase 1 — Project initialization and foundation
- [ ] Scaffold with `create-next-app@latest` in the repo root: TypeScript, ESLint, Tailwind CSS, App Router, `src/` directory, import alias `@/*`, npm, non-interactive. If it refuses because the folder isn't empty, scaffold into a temporary folder and move the files in, keeping `PRODUCT_REQUIREMENTS.md`, `BUILD_PROMPT.md`, and `opencode.json`.
- [ ] Install the §2 packages. Configure `strict` TypeScript, ESLint, `.gitignore`, and `.env.example`. Add the npm scripts from §16.
- [ ] Create `AGENTS.md`. It must point to `BUILD_PROMPT.md` and `PROGRESS.md`, list the commands, and summarize the non-negotiables: HeroUI v3, Next 16 proxy and async params, Zod 4, money in paisa, balanced ledger per transaction, server-side authorization, no hex colors outside `theme.css`, and the phase gate. Leave room for the Next.js-managed block.
- [ ] Create `PROGRESS.md` and `docs/DECISIONS.md`. Run `git init` if needed and make the first commit.
- [ ] Set up Vitest with the `MongoMemoryReplSet` global setup and one smoke test.

### Phase 2 — UI design system and public home page
- [ ] Add `theme.css` exactly as in §3.2 and the `globals.css` imports. Verify the HeroUI calculated-color variable names (§3.3).
- [ ] Load the fonts (§3.4) and set up `next-themes`. Add a theme toggle.
- [ ] Build the primitives: StatusBadge, MoneyText, StatCard, PageHeader, EmptyState, ConfirmDialog, AmountInput, PinInput, FilterBar, DataTable (responsive), ChartCard (with table view).
- [ ] Build the landing page with every PRD §10 section (§3.8 design).
- [ ] Build the `/login` and `/register` UI (wired up in Phase 4).
- [ ] Check: light and dark both look right; 360px, 768px, and 1280px widths work; keyboard focus is visible; no hex colors outside `theme.css` (grep).

### Phase 3 — MongoDB connection and database structure
- [ ] Cached `MongoClient` and Mongoose connection, `runInTransaction`, and env validation.
- [ ] Every §7 model, with indexes, Mongoose validation, and append-only guards on `ledgerEntries` and `auditLogs`.
- [ ] `ensureSystemAccounts`, settings defaults, the counters helper, account number and reference generators, money utilities, and the EMI utility, all with unit tests.
- [ ] `scripts/ensure-indexes.ts` and `scripts/verify-ledger.ts`.

### Phase 4 — Better Auth and role-based authorization
- [ ] Better Auth config (§5.3): mongo adapter with client, email/password, admin plugin with ac/roles, the escalation guard hook, the database hook that creates profiles, rate limiting, and `nextCookies` last.
- [ ] Auth route, auth client, and working login/register/logout with redirects by role.
- [ ] `proxy.ts` optimistic redirects. Server-side role checks in each role's `layout.tsx`.
- [ ] `withHandler`, the error model, the Origin check, guards, the rate limiter, and DTO helpers.
- [ ] First seed pass: create the admin, staff, and customer users.
- [ ] Tests: 401/403 behavior, and the escalation guard.

### Phase 5 — Redux Toolkit and RTK Query setup
- [ ] Store, provider, typed hooks, `baseApi` with error normalization and tags.
- [ ] Slices: auth, ui, accounts, transactions, loans. Error middleware and the global progress bar.
- [ ] App shell: sidebar, mobile bottom nav, top bar, notification bell placeholder wired to `/api/notifications/unread-count`, user menu with sign-out (resets the store).

### Phase 6 — Customer account management
- [ ] Customer services and routes: register by staff, list/search, details, KYC review, status, block/unblock.
- [ ] Account services and routes: open, list, details, lookup, update, freeze/unfreeze, limits, balance history.
- [ ] PIN set/change with lockout.
- [ ] UI: staff/admin customer pages, admin account pages, customer accounts pages with the switcher and statement card.
- [ ] Audit entries and notifications for these actions. Extend the seed with profiles and accounts.

### Phase 7 — Transaction management
- [ ] Ledger service, transfer service (§8.3), held-transfer review (§8.4), risk rules and manual flags (§8.7), reversal.
- [ ] Transaction list and detail routes with filters, search, and pagination. On-screen receipt and PDF receipt.
- [ ] UI: transfer flow (form → review with PIN → result), transaction history with filters, staff/admin transaction pages, review queue, flag resolution.
- [ ] Integration tests 1–7, 10, and 11 from §13.

### Phase 8 — Deposit and withdrawal workflows
- [ ] Request services and routes with holds, approval limits, and maker-checker (§8.5).
- [ ] UI: customer request form and history; staff/admin queue with confirm dialogs.
- [ ] Integration test 8. Extend the seed with history and pending requests.

### Phase 9 — Loan management
- [ ] Loan products, application with EMI preview, notes, forward, approve, reject, disburse, repay, completion (§8.6).
- [ ] UI: apply, list, detail (schedule, timeline, repayments), staff review, admin decision and disbursement.
- [ ] Integration test 9. Extend the seed with loans in every status.

### Phase 10 — Admin and staff dashboards
- [ ] Stats services and routes (§12).
- [ ] Admin overview (KPI cards, needs attention, integrity check), staff work queues, bank settings page, staff management, audit log page.
- [ ] Customer overview completed with real stats.

### Phase 11 — Charts, notifications, and optional features
- [ ] Every PRD §7 chart with Recharts, using real data, the §3.7 rules, range toggles, and table view.
- [ ] Notification center (bell, popover, page, mark as read) and every event type from §8.10.
- [ ] CSV and PDF statements (§8.11).
- [ ] Dark mode polish across every page.
- [ ] Optional, only if every core phase is green: two-factor login with Better Auth's `twoFactor` plugin (TOTP with QR code, backup codes, `/login/2fa` step). Skip it rather than ship it half-built, and record the decision.

### Phase 12 — Security testing and error handling
- [ ] Complete the §13 test suite (including test 12) and make it pass.
- [ ] Audit every §5.5 item and fix any gaps. Add the security headers. Re-check every route for role enforcement and ownership.
- [ ] Error boundaries, not-found pages, inline form errors, toasts, and retry states everywhere.
- [ ] Full seed + `verify:ledger` passes. Manually click through every role's main flows (or use a browser tool if one is available).

### Phase 13 — Deployment and documentation
- [ ] README complete (§16), with demo credentials and Mermaid diagrams.
- [ ] Production build passes. Vercel and Atlas instructions verified.
- [ ] Final pass over the §18 checklist. Update `PROGRESS.md` to all done.

---

## 18. Final acceptance checklist (maps to the PRD)

- [ ] Three roles with server-enforced permissions; frontend hiding is never the only protection (PRD §4, §5.1).
- [ ] Customer registration, login, logout, sessions, protected routes (PRD §5.1).
- [ ] Multiple accounts per customer: savings, current, business, with number, holder, type, available balance, status, and limits (PRD §5.2).
- [ ] Transfers between own accounts and to other customers. Validations: balance, recipient, status, limits, PIN. Unique ID, both sides recorded, atomic, history kept (PRD §5.3).
- [ ] Deposit and withdrawal requests: pending → approved/rejected by staff/admin (PRD §5.4).
- [ ] All five transaction types and four statuses. History, details, search by ID, date and type filters, pagination, receipts (PRD §5.5).
- [ ] Loans: application fields, all six statuses, staff notes and forwarding, admin approve/reject, disbursement through a recorded transaction, schedule, remaining balance, repayment history (PRD §5.6).
- [ ] Redux store with auth, account, transaction, and loan slices; RTK Query with caching, invalidation, centralized loading and errors (PRD §6).
- [ ] Admin, staff, and customer dashboards with the required cards and charts, using real data (PRD §7).
- [ ] Security: server-side balance validation, atomic transfers, preserved history, ownership checks, PIN, roles, duplicate prevention, error handling. A customer can't overspend, edit balances, see others' data, approve their own requests, or tamper with amounts (PRD §8).
- [ ] Bonus features: PDF receipts, notifications, limits, CSV/PDF statements, risk detection, dark mode, and optionally 2FA (PRD §9).
- [ ] Public site with every section and no private data (PRD §10).
- [ ] README with every required section, demo credentials for all roles, and documented environment variables (PRD §13).
- [ ] Works on desktop, tablet, and mobile (PRD §7, §15).
