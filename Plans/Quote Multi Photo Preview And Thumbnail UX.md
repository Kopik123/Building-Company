# Quote Multi Photo Preview And Thumbnail UX

## Summary
- Goal: improve the public quote-form experience so clients can attach multiple reference photos and immediately preview the selected files before submission.
- Scope: `quote.html`, generated service/location quote forms, shared public quote JS, public styling, and the brochure Playwright regression suite.
- Constraints: keep the current quote attachment backend contract unchanged, preserve the existing max of 8 images, and keep the UX portable for future mobile app/web client parity.

## Key Changes
- Added a shared preview container to the main quote page and the generated public quote forms so every brochure quote surface exposes the same photo-preview UX.
- Extended `quote.js` to render thumbnail cards for selected files, show clearer selected-file status text, and allow removing a single photo before submit while keeping multipart quote submission unchanged.
- Added brochure styling for the thumbnail grid/cards so the preview uses the existing dark/gold card language and stays readable on desktop and mobile.
- Expanded the Playwright brochure regression to cover multi-photo selection, thumbnail rendering, and single-photo removal before submit.

## Test Plan
- Automated: `npm.cmd run generate:public-pages:content`
- Automated: `npm.cmd run verify:generated`
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "core brochure pages render about, services, gallery, contact and quote routes|service, location and legal pages keep the same shell and single primary consultation route"`
- Automated: `npm.cmd run test:ci`

## Assumptions
- The new preview UX is needed on the public brochure quote forms first; the authenticated quote workspace already has its own attachment-review surface.
- Removing a selected file before submit is a net-positive UX addition and safe because it only mutates the client-side `FileList` before the request is sent.
- Keeping the existing disk-backed upload flow is still the right tradeoff for now; moving quote media to object storage is a later infrastructure decision, not part of this UX task.
