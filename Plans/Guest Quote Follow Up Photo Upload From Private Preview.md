# Guest Quote Follow Up Photo Upload From Private Preview

## Summary
- Goal: let a guest customer add more quote photos later from the private `publicToken` preview link instead of only during the first submit.
- Scope: extend the legacy public quote API, the brochure/private quote panel UI, and regression coverage for the follow-up upload flow.
- Constraints: keep the current legacy public auth/session model intact, preserve the 8-photo cap, and keep the contract portable for a future mobile client.

## Key Changes
- Add `POST /api/quotes/guest/:publicToken/attachments` so a guest quote can append more image attachments after the initial submission and return a refreshed preview payload.
- Rework the private follow-up panel in `quote.js` so it shows remaining photo slots, live thumbnail previews, per-file removal before upload, and refreshed saved-attachment cards after a successful follow-up upload.
- Keep quote events and manager notifications best-effort around the new follow-up upload so additional customer photos show up operationally without making the customer flow brittle.
- Extend API and Playwright regression coverage for guest follow-up uploads so the public quote portal remains stable across desktop and mobile browsers.

## Test Plan
- Automated: `node --test tests/api-v2/legacy-public-routes.test.js`
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "quote page shows a private guest quote preview after submit and from the saved quote link|guest quote private preview lets the customer add more photos after submit"`
- Automated: `npm.cmd run test:ci`
- Manual: deploy and verify that a guest can open the private quote link, add more photos, and see the saved quote preview update without re-submitting the whole form.

## Assumptions
- The new follow-up upload step targets the guest/private-preview path first; the claimed/logged-in customer portal can reuse the same attachment model later.
- Disk-backed quote attachments remain acceptable for now; object storage such as S3 or Cloudflare R2 is a later upgrade, not a blocker for this rollout.
- The same 8-photo cap should apply across the initial quote submission and every later follow-up upload batch.
