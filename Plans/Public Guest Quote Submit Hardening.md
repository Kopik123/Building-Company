# Public Guest Quote Submit Hardening

## Summary
- Goal: restore reliable public quote submission so customers can still send a quote even if internal quote side effects fail.
- Scope: harden the legacy `/api/quotes/guest` flow, add regression coverage for successful public submit, and protect the intake flow from non-critical notification/event failures.
- Constraints: quote persistence must stay authoritative, while internal notifications and timeline side effects should degrade gracefully instead of surfacing `500` to the user.

## Key Changes
- Keep `Quote.create(...)` as the only blocking operation in the public guest quote handler.
- Make `QuoteEvent.create(...)` and manager notification fan-out best-effort with warning logs so internal failures do not break customer submission.
- Add API regression coverage for the normal public quote payload and for the degraded path where quote side effects fail.

## Test Plan
- Automated: `node --test tests/api-v2/legacy-public-routes.test.js`
- Automated: `npm.cmd run test:ci`
- Manual: submit the public quote form on `/quote.html` with real contact data and confirm the page returns a reference instead of `Internal server error`.

## Assumptions
- The reported live failure happened after the quote payload reached the backend, not during frontend form serialization.
- The business priority is to always accept the customer enquiry first; internal event/notification loss is preferable to dropping the quote.
