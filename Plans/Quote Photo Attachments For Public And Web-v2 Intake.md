# Quote Photo Attachments For Public And Web-v2 Intake

## Summary
- Goal: let clients attach reference photos while sending a quote from the public website and from the authenticated `web-v2` quote flow.
- Scope: public `quote.html`, generated public quote forms, legacy guest quote intake, `api/v2` quote detail/upload flow, shared contracts, `web-v2` quote detail UI and regression coverage.
- Constraints: keep the current quote lifecycle compatible with future Android/iOS clients, preserve legacy guest quote intake, and avoid breaking existing quote/estimate/project conversion flows during rollout.

## Key Changes
- Add a persistent `QuoteAttachment` model, migration and helper layer so quote photos live as first-class records instead of ad-hoc payload metadata.
- Switch public quote submission from JSON-only to `multipart/form-data`, with optional image upload, photo-count validation and generated page parity.
- Extend `api/v2` quote payloads and `web-v2` quote UI so quote attachments are visible in quote detail and can be uploaded against an existing quote record.
- Add regression coverage for guest multipart quote submit, `api/v2` quote attachment upload, generated public forms and quote attachment migration compatibility.
- Better technology note: dedicated object storage such as S3 or Cloudflare R2 would be a better long-term home for quote media once mobile clients and higher upload volume arrive, but the current disk-backed upload flow is the right low-risk step for now because it fits the existing server/runtime contract.

## Test Plan
- Automated: `node --test tests/api-v2/legacy-public-routes.test.js`, `node --test tests/api-v2/quotes-rbac-crud.test.js`, `node --test tests/api-v2/migrations-quote-table-compat.test.js`, `npm.cmd run build` in `apps/web-v2`, `npm.cmd run generate:public-pages:content`, `npm.cmd run verify:generated`, focused Playwright on public quote/service pages, focused Playwright on `web-v2` quote surfaces, `npm.cmd run test:ci`.
- Manual: submit a public quote with 1-8 images, confirm manager/client quote detail shows the photos, and verify the success message includes both the quote reference and photo count.

## Assumptions
- Quote attachments are image-only for now; non-image files stay scoped to existing inbox/project chat uploads.
- The first release only needs upload during quote submission or from authenticated quote detail, not a separate guest follow-up upload portal.
- `web-v2` remains the target authenticated surface, while legacy public quote intake keeps acting as the compatibility bridge for brochure pages during rollout.
