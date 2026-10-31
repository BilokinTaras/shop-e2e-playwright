# ADR-002: Network control in a server-rendered storefront

- Status: accepted
- Date: 2026-10-31

## Context

`page.route()` and `context.setOffline()` act on requests **the browser** makes. The Medusa storefront
is a Next.js App Router application: product, cart and checkout data are fetched by the Next.js server
and arrive as HTML or React Server Component payloads. Mocking "the cart API returns 500" from the
browser is therefore impossible for most pages — the browser never calls the cart API.

What the browser does call (measured on the pinned version by logging requests):

| Request                                                                                      | From where               | Controllable with `page.route`            |
| -------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------- |
| Images (`/qa/*.png`, Medusa S3)                                                              | browser                  | yes                                       |
| `POST http://localhost:9000/store/search` (search drawer, store listing)                     | browser → backend        | yes                                       |
| Server action `POST http://localhost:8000/<page>` (add to cart, checkout steps, promo codes) | browser → Next.js server | yes, as a whole (abort / offline / delay) |
| Next.js server → Medusa Store API (products, cart, regions)                                  | server → backend         | **no**                                    |

## Decision

1. Network tests cover only the browser-visible layer: blocked images, failing and slow client-side
   search, offline during a server action. No test pretends to mock a server-side call.
2. Slow responses are simulated by **holding** the request until the test has asserted the loading state
   and then releasing it — no fixed delays.
3. Server-side failures (backend 500, timeouts between Next.js and Medusa) are out of scope for this
   repository's browser tests. The way to test them is a fault-injection proxy between the storefront
   and the backend (e.g. Toxiproxy as a Compose service in `shop-sut`, with the storefront pointed at it);
   this is listed in the roadmap rather than faked.

## Alternatives considered

| Option                                                             | Why not                                                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Mock server-side fetches with `page.route`                         | Does not work: the browser never sees them. A green test would be a false claim.                            |
| Next.js experimental test mode with server-side fetch interception | Requires changing how the storefront is built and started; diverges from production mode (shop-sut ADR-002) |
| Stop the backend container during a test                           | Breaks every other parallel test; not isolated                                                              |
| Toxiproxy between storefront and backend                           | Correct tool; needs a second backend URL in the stand and per-test proxy control — planned                  |

## Consequences

- Coverage claims stay honest: the README lists what is and is not covered under network failures.
- Two real defects came out of the browser-visible layer anyway (BUG-E2E-005, BUG-E2E-007).
