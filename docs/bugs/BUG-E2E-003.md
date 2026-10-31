# BUG-E2E-003: Registration without a password returns 401 "unauthorized" instead of a validation error

| Field        | Value                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Severity     | **Trivial** — wrong status class and error type; the message itself is understandable                       |
| Priority     | **Low**                                                                                                     |
| Component    | Auth API, `POST /auth/customer/emailpass/register`                                                          |
| Environment  | Medusa 2.22.2, see [findings](../findings.md#findings)                                                      |
| Related test | `tests/api/auth-and-access.spec.ts` › "registration without a password is a validation error [BUG-E2E-003]" |

## Steps to reproduce

`POST /auth/customer/emailpass/register` with `{"email":"qa-x@example.com"}` (no `password`).

## Expected

`400 {"type":"invalid_data", ...}` — a missing required field is a client validation error, as
everywhere else in the API (e.g. a line item without `variant_id` → `400 invalid_data "Field 'variant_id' is required"`).

## Actual

`401 {"type":"unauthorized","message":"Password should be a string"}`.

## Evidence

[evidence/BUG-E2E-003-http.txt](evidence/BUG-E2E-003-http.txt)

## Impact

Clients that treat 401 as "session expired, log in again" can loop or show the wrong message.
