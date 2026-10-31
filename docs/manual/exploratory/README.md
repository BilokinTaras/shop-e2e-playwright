# Exploratory testing (SBTM)

Three session-based exploratory sessions on the local stand, 2026-10-31. Format: charter → timebox →
notes → bugs → issues/questions, after James Bach's Session-Based Test Management.

**How the sessions were run:** each session was driven by a short Playwright script written during the
session (not a pre-written test) that performed the probes listed in the notes, logged what the UI
showed and saved the screenshots in `img/`. The scripts were thrown away after the session, as
exploratory notes usually are; the observations below are the record. Scripted exploration is faster to
repeat but misses what a human notices by eye (layout, wording, hesitation), so the owner repeats these
charters manually before each release.

| # | Charter | Bugs | Questions |
|---|---|---|---|
| [S1](session-1-promo-codes.md) | Promo code input at checkout: case, whitespace, repeats, stacking, hostile input | BUG-E2E-005 (scope widened) | 2 |
| [S2](session-2-stock.md) | Cart quantities against real stock, and the race for the last item | BUG-E2E-008, BUG-E2E-005 (scope widened) | 1 |
| [S3](session-3-regions.md) | Region and currency switching between Europe (EUR) and North America (USD) | — | 1 |

Environment for all sessions: `shop-sut` commit `62d1e81` (Medusa 2.22.2, storefront production build),
Chromium 156 desktop 1280×900, Windows 11.
