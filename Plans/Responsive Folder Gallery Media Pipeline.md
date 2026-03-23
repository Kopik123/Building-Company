# Responsive Folder Gallery Media Pipeline

## Summary
- Extend the raw folder-backed gallery so `Gallery/<folder>/...` images also flow through the `sharp` optimization pipeline.
- Keep folder-backed gallery data as the source of truth while mapping raw folder image URLs to optimized AVIF/WebP/JPG variants through `asset-manifest.js`.
- Ensure the new optimized outputs do not become visible gallery groups by ignoring the generated `Gallery/optimized` directory in folder scans.

## Key Changes
- Update `utils/folderGallery.js` to ignore `Gallery/optimized` and expose a sync source-image listing helper for the asset pipeline.
- Update `scripts/asset-optimization.config.js` so it dynamically includes raw folder gallery sources in addition to the existing premium aliases.
- Write optimized raw-folder outputs under `Gallery/optimized/<folder>/...` to avoid collisions with source images and keep gallery folder scans clean.
- Update `scripts/optimize-assets.js` so manifest URLs are safely encoded for filenames with spaces, which is required for valid `srcset` output.
- Add regression coverage to ensure:
  - `/api/gallery/services` still ignores generated folders
  - folder-driven gallery UI renders optimized `<picture>` sources for raw folder images

## Test Plan
- `npm.cmd run optimize:assets`
- `node --test tests/api-v2/legacy-public-routes.test.js`
- `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "core brochure pages render about, services, gallery, contact and quote routes|gallery collapses intro and side previews cleanly on narrower desktop widths|gallery uses contain for the center image and cover for side previews on wide desktop"`
- `npm.cmd run test:ci`
- `npm.cmd run test:e2e:mobile`

## Assumptions
- `Gallery/premium/*` remains useful as brochure-facing aliases, so this step adds raw-folder optimization instead of replacing the premium layer.
- `Gallery/optimized` is a generated output folder only and must never appear as a visible gallery rail/service group.
- Using encoded manifest URLs is the safest choice now because several gallery assets contain spaces in their filenames.
