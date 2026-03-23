# Folder Names As Gallery Source Of Truth

## Summary
- Make folder-backed gallery data the source of truth for all folder-driven gallery views and the service-gallery API.
- Replace curated/titled project names with the raw folder names exactly as they exist on disk, for example `bathroom`, `exterior`, `kitchen`.
- Sort gallery groups alphabetically by raw folder name and sort images inside each group alphabetically by raw filename.
- Keep managed DB-backed `/api/gallery/projects` unchanged; this change applies only to the folder-backed gallery pipeline, because only that pipeline has folder semantics.

## Key Changes
- Update the folder-gallery builder in `utils/publicGallery.js` so `/api/gallery/services` returns:
  - `services[].id = raw folder name`
  - `services[].name = raw folder name`
  - `services[].images` sorted A-Z by filename
  - service groups sorted A-Z by folder name
  - empty folders omitted from the payload
- Update `gallery.js` so the public gallery stops overriding folder/API data with curated service bundles and instead consumes raw folder names directly.
- Update `gallery.html` so the initial gallery heading/meta no longer reference the removed curated service naming.
- Update the generated service/location page pipeline so inline `data-gallery-projects-json` payloads now come from the same folder-backed source used by the API.
- Treat the current singular folder layout as canonical:
  - `Gallery/bathroom`
  - `Gallery/exterior`
  - `Gallery/interior`
  - `Gallery/kitchen`
- Repoint the premium alias optimisation config to the canonical singular source folders so `Gallery/premium/*` can still be regenerated from the new folder structure.

## Test Plan
- Update API coverage for `/api/gallery/services` to assert:
  - raw folder names are returned unchanged
  - groups are sorted A-Z by folder name
  - images are sorted A-Z by filename
  - empty folders are skipped
- Update Playwright gallery coverage to assert:
  - rail labels show raw folder names
  - the first visible group/order matches alphabetical folder order
  - image status updates follow the folder-driven ordering
- Run:
  - `npm.cmd run optimize:assets`
  - `npm.cmd run generate:public-pages:content`
  - `npm.cmd run verify:generated`
  - focused gallery Playwright coverage
  - `npm.cmd run test:ci`
  - `npm.cmd run test:e2e:mobile`

## Assumptions
- “API + wszystkie widoki” means the folder-backed gallery API plus all gallery UIs that consume folder-driven data, not the managed DB-backed `/api/gallery/projects` endpoint.
- Raw folder names should be shown exactly as they exist on disk, without title-casing or friendly aliases.
- Alphabetical order is the intended default for both folder groups and files because no custom order was requested.
- Empty folders remain hidden until they contain at least one image.
