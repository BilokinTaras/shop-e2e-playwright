# ADR-003: Visual baselines from the official Playwright Linux image, Chromium only

- Status: accepted
- Date: 2026-10-31

## Context

Screenshots differ between operating systems (font rendering, anti-aliasing, emoji, scrollbars) and
between browser engines. Baselines taken on a MacBook will fail in Linux CI and vice versa. The stand
runs on localhost, so a browser in a container must reach it exactly as a host browser does.

## Decision

1. Visual tests run **only in Chromium**, in project `visual`, at a fixed 1280×900 viewport.
2. They run **only inside `mcr.microsoft.com/playwright:v<installed version>-noble`**
   (`scripts/visual-docker.sh`, `npm run test:visual`). The project is enabled by `PW_VISUAL=1`, which
   only that script sets, so a plain `npx playwright test` on macOS or Windows never compares against
   Linux baselines. Baselines from macOS/Windows are never committed.
3. The container joins the backend container's network namespace (`--network container:<medusa>`), so
   `http://localhost:8000` and `:9000` work unchanged — no host networking, works on Docker Desktop for Mac.
4. Four stable screens: home, product, cart with one item, checkout address step. Animations and caret
   are disabled; masked zones: related products (images from Medusa's public S3), the footer year and the footer category
   list, whose order differs between installations (BUG-E2E-009, found by the first CI run).
5. QA products use local images served by the storefront, so the screens do not depend on the internet.

## Alternatives considered

| Option                                                | Why not                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Baselines per OS (`{platform}` in the snapshot path)  | Three sets to maintain; CI would still only verify one                          |
| Visual tests in all three browsers                    | Triples the baselines for little extra signal; layout bugs show in Chromium too |
| A hosted visual service (Percy, Applitools, Argos)    | External account and upload of screenshots; not needed for four screens         |
| Threshold-based comparison to tolerate OS differences | Hides real 1–2 px regressions; makes the test meaningless                       |

## Consequences

- Updating baselines is a deliberate step: `npm run test:visual:update`, review the PNG diff, commit.
- In CI the same image runs the visual project weekly (`weekly.yml`) and uploads the diff; new baselines come
  from `update-visual-baselines.yml` as an artefact for review, never as an automatic commit.
