# BUG-E2E-001: Negative `limit` or `offset` on `GET /store/products` returns 500 instead of 400

| Field        | Value                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Severity     | **Minor** — no data is affected, but a client mistake produces an unhandled server error                                         |
| Priority     | **Medium** — 500s pollute error monitoring and alerting; fuzzers and scanners report them; cheap fix (`min(0)` in the validator) |
| Component    | Store API, `GET /store/products` query validation                                                                                |
| Environment  | Medusa 2.22.2, see [findings](../findings.md#findings)                                                                           |
| Related test | `tests/api/catalog.spec.ts` › "negative limit is rejected with 400, not a server error [BUG-E2E-001]"                            |

## Preconditions

A valid publishable API key.

## Steps to reproduce

1. `GET /store/products?limit=-1` with header `x-publishable-api-key`.
2. Repeat with `offset=-1`.

## Expected

`400` with `{"type":"invalid_data", ...}`, like other invalid query values: `limit=abc` returns
`400 invalid_data "Expected type: 'number' for field 'limit'"`. The API reference documents `limit` and
`offset` as numbers used for pagination; a negative page size or start index is not a valid value.

## Actual

`500 {"code":"unknown_error","type":"unknown_error","message":"An unknown error occurred."}` for both.

## Evidence

[evidence/BUG-E2E-001-http.txt](evidence/BUG-E2E-001-http.txt)

## Impact

Clients get a generic server error instead of an actionable validation message; operations see false
alarms. The same validator pattern probably applies to other list endpoints (to be checked in the
pytest suite's contract tests).
