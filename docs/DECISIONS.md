# Decisions

One line per decision: the decision, then the reason.

- The product requirements document lives in `PRD.md`, not `PRODUCT_REQUIREMENTS.md` as the build prompt says; kept the provided filename and referenced it as the PRD everywhere — renaming supplied files risks breaking external references.
- Dependency installation (`npm install`) was skipped per user instruction after repeated registry timeouts; the full dependency manifest and lockfile-less manifest were written, but phase-gate commands cannot run until dependencies are installed — respect the user's explicit instruction and keep progress visible.
- `cacheComponents` and `partialPrefetching` were disabled in `next.config.ts` — role layouts and API routes need `headers()`/`cookies()`, which require Suspense boundaries under cache components; a banking dashboard is dynamic by nature.
- `serverExternalPackages: ["mongoose", "mongodb"]` was added — native/driver packages must not be bundled by Turbopack on the server.
- Account type is fixed at opening; only the nickname can be edited later — changing the type would change the account number format and limit defaults, so it would be a new account.
- CSV/ PDF amounts are written as `BDT` plain decimals rather than the ৳ glyph — standard PDF fonts do not include the Bengali currency glyph.
- HeroUI v3 calculated colors were verified against `variables.css` in the upstream v3 source (`--accent-hover`, `--accent-soft`, `--accent-soft-foreground`, `--success-soft`, etc.); our unlayered theme overrides them and derived hovers inherit the new source values — node_modules is unavailable locally.
- Navigation links that look like buttons use the documented `.button button--primary|ghost|outline` BEM classes instead of `<Button as={Link}>` — HeroUI v3 removed `asChild` and documents a `render` prop, so styling an anchor avoids relying on an unconfirmed polymorphic API.
- Money, mask, and time utilities were created in Phase 2 rather than Phase 3 — the UI primitives need them immediately; their unit tests still land in Phase 3.
