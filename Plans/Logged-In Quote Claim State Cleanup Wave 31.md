# Logged-In Quote Claim State Cleanup Wave 31

## Summary
- Goal: ensure a signed-in client never has to confirm a claim code after submitting a quote from an authenticated session.
- Scope: public quote submit flow, follow-up state, stale pending-claim storage cleanup, and regression coverage.
- Constraints: keep the guest claim flow intact and do not break the new `new_quotes` staging path.

## Key Changes
- Clear any stale browser-side pending quote claim after a successful account-linked `/api/v2/new-quotes` submit.
- Extend the signed-in quote browser regression so it seeds an old pending claim and verifies that the account-linked submit removes it while keeping the claim panel hidden.
- Keep the existing guest/private quote claim flow unchanged.

## Test Plan
- Automated: `node --check quote.js`
- Automated: `node --check tests/playwright/public-redesign.spec.js`
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "quote page reuses saved client account details and hides duplicate contact fields"`
- Manual: submit a quote while logged in and confirm the success state links directly to account quotes with no claim-code prompt.

## Assumptions
- Any pending claim token left in browser storage during an authenticated account-linked quote submit is stale and safe to clear.
- Guest quote flows still rely on claim code confirmation and should not be changed in this wave.
