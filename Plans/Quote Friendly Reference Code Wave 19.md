# Quote Friendly Reference Code Wave 19

## Summary
- Replace guest-facing quote UUID references with a friendlier reference code.
- Keep the UUID as the technical identifier for API routes, claims and internal relations.
- Make the new reference portable across public quote submit, private preview and auth claim handoff without a schema migration.

## Key Changes
- Add a shared quote-reference helper that derives a readable code from postcode/contact data and appends a numeric suffix when a duplicate contact/location path already exists.
- Return `referenceCode` from the public guest quote submit, preview and claim endpoints while keeping `quoteId` unchanged for technical API use.
- Update the public quote frontend and claim/auth copy to prefer `referenceCode` anywhere a customer sees the quote reference.

## Test Plan
- Run syntax checks for the touched frontend/backend files.
- Run focused API tests for legacy public quotes, v2 public quotes and the new quote-reference helper.
- Run focused Playwright coverage for submit, preview, retry-safe upload and claim handoff flows.

## Assumptions
- Public guest quote routes remain the main customer-facing place where the reference code matters most right now.
- A computed reference code is safer than replacing UUID primary keys or adding a new persisted column during this change.
