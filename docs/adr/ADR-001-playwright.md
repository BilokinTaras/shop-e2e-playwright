# ADR-001: Playwright Test with TypeScript for UI and API automation

- Status: accepted
- Date: 2026-10-31

## Context

One framework must cover the Medusa storefront (Next.js), the admin dashboard (React SPA) and the Store and
Admin REST APIs, run in three browser engines plus mobile emulation, and produce a report with traces
that a reviewer can open without installing anything. Target vacancies ask most often for Playwright,
then Cypress and Selenium, and accept TypeScript.

## Decision

Playwright Test 1.64.1 with TypeScript in strict mode, zod for response schemas, faker for data,
axe-core for accessibility.

## Alternatives considered

| Option                 | Pros                                                                                                                                                                                | Cons                                                                                                                                                                                | Why not                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Cypress**            | Great interactive runner, big community                                                                                                                                             | Runs inside the browser: multi-tab, multi-origin (storefront :8000 + admin :9000) and API-only suites are awkward; WebKit support experimental; parallelism is a paid cloud feature | Two origins and a pure API layer are core here               |
| **Selenium WebDriver** | W3C standard, every language                                                                                                                                                        | No built-in runner, waits, fixtures, tracing or API client; more code for the same coverage                                                                                         | Too much infrastructure to build for a portfolio-sized suite |
| **WebdriverIO**        | Flexible, WebDriver + DevTools                                                                                                                                                      | Smaller ecosystem for API testing, more configuration                                                                                                                               | Playwright gives the same coverage with less glue            |
| **Playwright Test**    | Auto-waiting and web-first assertions, Chromium/Firefox/WebKit, `APIRequestContext` for API tests in the same runner, fixtures, projects, sharding, trace viewer, HTML/blob reports | Smaller community than Selenium in some enterprises                                                                                                                                 | **Chosen**                                                   |

## Consequences

- UI and API tests share fixtures (an admin token, a fresh customer, cleanup of created data), so
  hybrid tests "prepare via API → act in UI → verify via API" are natural.
- Retries are enabled only in CI and only to collect traces; a test that passes on retry is reported
  as flaky and fixed, not hidden.
- Cypress and Selenium knowledge is covered conceptually (locators, waits, page objects transfer).

## References

- https://playwright.dev/docs/test-projects · https://playwright.dev/docs/api-testing · https://playwright.dev/docs/test-sharding
