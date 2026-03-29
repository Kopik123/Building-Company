# Quote Stage 3 Upload Recovery And Layout Refresh Wave 17

## Summary
- Goal: stop the stage-3 public quote failure caused by large photo uploads and realign the quote page layout with the requested full-width title/header plus wider form shell.
- Scope: `quote.html`, `quote.js`, `styles/quote-flow.css`, `styles/public.css`, and focused Playwright regression coverage.
- Constraints: keep the existing public `/api/v2/public/quotes` contract, preserve the private quote preview/follow-up flow, and avoid breaking generated service/location quote forms that reuse `quote.js`.

## Key Changes
- Refresh the quote-page shell so the oversized left hero copy is replaced by a compact full-width header band and a wider two-column working layout.
- Change the stage-3 submit flow to save the quote brief first, then upload photos through the existing private-token attachment route in small batches.
- Add browser-side image preparation/compression for large quote photos before upload, so mobile camera images stop failing the public quote send path so easily.
- Improve quote-submit error handling so non-JSON or `413` attachment failures produce a useful retry message instead of the generic consultation-request failure text.
- Collapse the mobile public auth panel behind the existing auth toggle so the sticky header no longer intercepts quote-form taps on compact/mobile layouts.
- Lock the new behavior with Playwright coverage for: refreshed quote route rendering, successful post-submit attachment upload, fallback when photo upload needs retry, and guest follow-up photo uploads.

## Test Plan
- Automated
  - `node --check quote.js`
  - `node --check tests/playwright/public-redesign.spec.js`
  - `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "core brochure pages render about, services, gallery, contact and quote routes|quote page shows a private guest quote preview after submit and from the saved quote link|quote page keeps the private quote link when photo upload needs retry|guest quote private preview lets the customer add more photos after submit"`
- Manual
  - Verify `/quote.html` on desktop keeps the compact top band plus wider form shell.
  - Verify stage 3 can submit a brief with large mobile photos and, if upload still fails, the private quote link appears with a retry-safe message.

## Assumptions
- The live attachment failure is primarily a payload-size problem triggered by large reference photos, not a text-field validation problem in the brief itself.
- Uploading photos after quote creation is acceptable product behavior because the private quote link already supports follow-up attachment uploads.
- Keeping the quote created even when photo upload fails is better than blocking the whole enquiry, as long as the user gets a clear retry path.
