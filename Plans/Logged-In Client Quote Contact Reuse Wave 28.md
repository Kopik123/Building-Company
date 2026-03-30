# Logged-In Client Quote Contact Reuse Wave 28

## Summary
- Simplify the public quote form for signed-in clients by reusing account profile details instead of asking for duplicated contact inputs.
- Keep the existing public quote route and private follow-up link flow stable while reducing friction in step 1.
- Add browser regression coverage so future header/session changes do not reintroduce duplicated client contact fields on the quote page.

## Changes
- Add a signed-in client summary card to step 1 of `quote.html`.
- Hide contact inputs that already exist on the signed-in client profile while leaving missing profile fields editable.
- Pre-fill the hidden contact inputs from stored session data so the submit payload still carries `guestName`, `guestEmail` and `guestPhone` consistently.
- Re-run the quote/account sync after session changes and after form reset so the simplified state stays accurate.
- Add Playwright coverage for the logged-in client quote path plus a sanity pass for the existing guest quote preview flow.

## Validation
- `node --check quote.js`
- `node --check tests/playwright/public-redesign.spec.js`
- `git diff --check`
- `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "quote page reuses saved client account details and hides duplicate contact fields"`
- `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "quote page shows a private guest quote preview after submit and from the saved quote link"`

## Notes
- A cleaner long-term product flow would route signed-in clients directly into authenticated `/api/v2/quotes` creation so the later claim step can disappear entirely.
- That would be better architecture for web plus future mobile clients, but it is a larger behavioral change than needed for this friction-reduction wave, so it is better left for a separate cutover task.
