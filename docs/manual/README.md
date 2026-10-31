# Manual QA package

Manual test design for the Medusa 2.22.2 shop on the local `shop-sut` stand. Each case is traced to the
automated test that covers it, where one exists.

| File | Contents |
|---|---|
| [test-plan.md](test-plan.md) | Test plan in condensed IEEE 829 / ISO/IEC/IEEE 29119-3 form: scope, items, approach, criteria, environments, data, risks, schedule placeholders |
| [test-cases.csv](test-cases.csv) | 106 test cases (TC-001…TC-106) for import into TestRail, Qase or Zephyr Scale |
| [smoke-checklist.md](smoke-checklist.md) | 14 checks a person can run in about 10 minutes before a release |
| [exploratory/](exploratory/README.md) | Three session-based exploratory sessions (charters, notes, bugs, questions) |

## How the cases map to automation

`Automated By` is either `manual` or `<file> › <test title>`, with the title written exactly as it
appears in the spec. One test can cover more than one case. For example, the guest checkout E2E test
covers TC-042 (the happy path) and TC-054 (mobile emulation).

| | Cases |
|---|---:|
| **Total** | **106** |
| Automated (an existing test covers the case) | 76 |
| of which pass | 70 |
| of which fail now, on a documented defect | 6 |
| Manual only | 30 |

**Currently failing (6).** Each of these is covered by a strict expected-failure test (`test.fail`)
that encodes the correct behaviour:

| Case | Defect |
|---|---|
| TC-021 | [BUG-E2E-004](../bugs/BUG-E2E-004.md) |
| TC-036 | [BUG-E2E-005](../bugs/BUG-E2E-005.md) |
| TC-072 | [BUG-E2E-002](../bugs/BUG-E2E-002.md) |
| TC-079 | [BUG-E2E-001](../bugs/BUG-E2E-001.md) |
| TC-089 | [BUG-E2E-003](../bugs/BUG-E2E-003.md) |
| TC-105 | [BUG-E2E-007](../bugs/BUG-E2E-007.md) |

| Section | Cases | Automated | Manual only |
|---|---:|---:|---:|
| Catalog | 14 | 10 | 4 |
| Product | 5 | 4 | 1 |
| Cart | 12 | 9 | 3 |
| Promotions | 10 | 5 | 5 |
| Checkout | 14 | 5 | 9 |
| Account | 6 | 5 | 1 |
| Admin | 7 | 4 | 3 |
| API-Auth | 10 | 10 | 0 |
| API-Validation | 13 | 12 | 1 |
| Accessibility | 10 | 7 | 3 |
| Network | 5 | 5 | 0 |

**Status values**

- `Pass`: an existing automated test covers the case and passed in the latest full local run
  (2026-10-31; metrics in section 7 of the [test strategy](../test-strategy.md)). The visual cases
  pass in the Linux image run.
- `Fail (BUG-E2E-00N)`: the covering test is a strict expected failure. When the defect is fixed, the
  test passes, the `test.fail` mark is removed and the status becomes `Pass`.
- `Not run`: the case is manual and has not been executed as a scripted case. Some manual cases touch
  areas that the exploratory sessions probed (TC-005, TC-026, TC-027, TC-033, TC-040, TC-048,
  TC-053). Session notes are not scripted executions, so these cases stay `Not run`. When a manual
  case's expected result is already known to be violated, the case names the defect: TC-026 and
  TC-027 (BUG-E2E-008, BUG-E2E-005), TC-067 (A11Y-001) and TC-100 (A11Y-002).

A few tests check infrastructure rather than product behaviour and have no case of their own: backend
health (smoke checklist item 1), the schema self-check, the agent seed and the customer sign-in setup.

**Techniques:** equivalence partitioning 28 · checklist 25 · boundary value analysis 13 · use case 12 ·
error guessing 12 · state transition 10 · decision table 6.

### Decision table: promo code (TC-032…037)

| | R1 | R2 | R3 | R4 | R5 | R6 |
|---|---|---|---|---|---|---|
| Code valid? | Y | Y | Y | Y | N | N |
| Cart empty? | N | N | Y | Y (emptied after applying) | N | Y |
| Already applied? | N | Y | N | Y | – | – |
| Expected | Discount applied | Not doubled | No 5xx, totals 0 | Totals 0 | Readable error, totals unchanged | 400 `invalid_data` |
| Case | TC-032 | TC-033 | TC-034 | TC-035 | TC-036 | TC-037 |

### State transitions: checkout (TC-042…053)

`Cart → Address → Delivery → Payment → Review → Order placed`

| From | Event | To | Case |
|---|---|---|---|
| Cart → … → Review | Happy path, Place order | Order placed | TC-042 (UI), TC-049 (API, completed twice) |
| Address | Invalid email or empty required field | Address (no change) | TC-051, TC-052 |
| Review | Edit address / edit delivery | Address / Delivery, then forward again | TC-043, TC-044 |
| Payment | Back to the cart, quantity 1 → 2 | Checkout with new totals | TC-045 |
| Address only | Open `?step=review` by URL | Review without Place order | TC-046 |
| Order placed | Back, or re-open checkout | No checkout, no second order | TC-047 |
| Cart (EUR) | Country switched to United States | Cart (USD), US/CA countries and shipping | TC-048 |

## Importing the CSV

The file is UTF-8 (no BOM) with LF line endings and a header row. The only non-ASCII character is
`›` in `Automated By`. If a spreadsheet shows `â€º`, open the file through the spreadsheet's UTF-8 text
import. Steps are kept in one cell and separated by ` | `. That suits single-field step templates. For
a separated-steps template, replace ` | ` with line breaks before importing.

### TestRail

1. Once, under Administration → Customizations, add the case fields **Technique** (dropdown with the
   seven technique values) and **Automated By** (string). Add **Test Data** (text) too, or merge that
   column into Preconditions. `Status` is a run result, not a case attribute. Leave it out, or keep
   it in a text field such as "Last known status", and record real results in a test run.
2. Go to Test Cases → Import → **Import from CSV**. Upload `test-cases.csv` and choose encoding UTF-8,
   delimiter comma and header row 1. Select the template **Test Case (Text)**, with one row per test
   case.
3. Map the columns: Title → Title · Section → Section (sections are created) · Priority → Priority ·
   Type → Type · Preconditions → Preconditions · Steps → Steps · Expected Result → Expected Result ·
   Technique, Automated By, Test Data → the custom fields · ID → References (or a custom field) to
   keep the `TC-NNN` link to the automation.
4. Map the values: Priority High/Medium/Low maps one to one. Type Functional, Accessibility and
   Compatibility exist by default. Map Negative and Boundary to Functional and UI to Other, or add those
   values to the Type list first.
5. Check the preview, then import.

### Qase

1. In the project repository, open **Import** and choose CSV as the source.
2. Upload `test-cases.csv` and map the fields: Section → suite · Title → title ·
   Preconditions → preconditions · Steps → step action · Expected Result → expected result ·
   Test Data → step data · Priority → priority (high/medium/low) · Type → type (Functional →
   functional, Compatibility → compatibility, others → other). Put Automated By into a custom field
   or the description, and set *automation* to "automated" where it is not `manual`.
3. If your Qase version expects its own CSV headers instead of a mapping step, download the template
   from the import dialog, rename the header row of `test-cases.csv` to match, and import again.

Zephyr Scale's CSV import uses the same pattern: upload the file, then map columns to fields in the
wizard.

## Keeping the CSV honest

After any edit, run this check from the repository root. It confirms 12 columns on every row, unique
IDs, and that every non-manual `Automated By` title appears literally in the referenced spec:

```bash
python -c "import csv,re,sys;r=list(csv.reader(open('docs/manual/test-cases.csv',encoding='utf-8')));b=r[1:];e=[x[0] for x in b if len(x)!=12];d=len({x[0] for x in b})!=len(b);m=[x[0] for x in b if x[10]!='manual' and (lambda f,t:\"'\"+t+\"'\" not in open(f,encoding='utf-8').read())(*x[10].split(' \u203a ',1))];print('rows',len(b),'bad',e,'dup',d,'missing',m);sys.exit(bool(e or d or m))"
```
