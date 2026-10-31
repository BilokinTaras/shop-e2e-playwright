# BUG-E2E-002: Customer registration issues a token for a string that is not an email

| Field        | Value                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Severity     | **Minor** — creates orphan auth identities; the next step (customer profile) rejects the email           |
| Priority     | **Low** — the storefront form validates email client-side, so mostly API clients are affected            |
| Component    | Auth API, `POST /auth/customer/emailpass/register` (email/password provider)                             |
| Environment  | Medusa 2.22.2, see [findings](../findings.md#findings)                                                   |
| Related test | `tests/api/auth-and-access.spec.ts` › "registration rejects a string that is not an email [BUG-E2E-002]" |

## Steps to reproduce

1. `POST /auth/customer/emailpass/register` with `{"email":"not-an-email-1","password":"Pass-123-abc"}`.
2. Use the returned token: `POST /store/customers` with `{"email":"not-an-email-1", ...}`.
3. `POST /auth/customer/emailpass` with the same credentials.

## Expected

Step 1 returns `400 invalid_data` — the provider is called *email*pass and step 2 itself validates the
same field as an email.

## Actual

1. `200` with a registration token — an auth identity is created.
2. `400 {"type":"invalid_data","message":"Invalid request: Invalid email address"}`.
3. `200` with a login token for an identity that can never have a customer profile.

## Evidence

[evidence/BUG-E2E-002-http.txt](evidence/BUG-E2E-002-http.txt) (token redacted).

## Impact

Inconsistent validation between two steps of the same sign-up flow; orphan identities accumulate and
can log in. Not exploitable on its own.
