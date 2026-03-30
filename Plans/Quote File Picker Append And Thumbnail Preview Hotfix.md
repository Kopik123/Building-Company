# Quote File Picker Append And Thumbnail Preview Hotfix

## Summary
- Goal: fix the public quote photo picker so selecting more files appends to the current selection instead of replacing it, and restore thumbnail previews for local image picks.
- Scope: brochure quote form, guest follow-up upload card, CSP headers, and browser regression coverage.
- Constraints: keep the current quote attachment backend contract unchanged and preserve the existing 8-photo cap across initial and follow-up uploads.

## Key Changes
- Add client-side file-selection state in `quote.js` so reopening the picker merges newly chosen files with the existing selection, supports per-file removal, and submits the merged list for both initial quote submit and follow-up uploads.
- Allow `blob:` image sources in the public CSP so browser-generated local preview thumbnails can render before the files are uploaded.
- Extend Playwright coverage to prove both append-on-second-pick behavior and successful thumbnail rendering for the initial quote form and the guest follow-up upload card.

## Test Plan
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "core brochure pages render about, services, gallery, contact and quote routes|guest quote private preview lets the customer add more photos after submit"`
- Automated: `npm.cmd run test:ci`
- Manual: select one quote photo, reopen the picker and add another, verify both thumbnails stay visible, then remove one and confirm the remaining file still submits.

## Assumptions
- The reported replacement bug refers to browser-side file selection state before upload, not to persisted attachments already stored in the database.
- Allowing `blob:` in `img-src` is an acceptable short-term security tradeoff because it is limited to same-page preview rendering and does not widen script execution.
