# Live QA, Asset Optimization And Richer Gold Tuning

## Summary

- Focus this pass on three concrete outcomes:
  - a repeatable live QA checklist for phone and desktop
  - lighter runtime assets for `title/logo/gallery`
  - a richer dark-gold theme on dark surfaces without breaking the contrast rule
- Recommended technology for asset work: a repo-native Node pipeline with `sharp`.
  - Better than manual exports now because it is repeatable, versionable, and maps cleanly to future Android/iOS asset workflows.
  - Better long-term alternatives like Cloudinary/ImageKit exist, but they are not worth adopting now for this repo.

## Key Changes

### 1. Live QA checklist for desktop and phone

- Run live QA against:
  - `/`
  - `/auth.html`
  - `/client-dashboard.html`
  - `/manager-dashboard.html`
  - one service page
  - one location page
- Desktop checklist:
  - header proportions read as `logo | title | account/nav`, with no crowding
  - `title.png` stays centered and does not dominate the account box
  - homepage first fold reads cleanly with no clipped text or awkward wrapping
  - gallery/project panels align cleanly and arrows/controls remain visible
  - manager and client top boards feel balanced and equal in visual weight
  - gold on dark surfaces looks richer, but not yellow or low-contrast
- Phone checklist at `390px`:
  - no horizontal scroll
  - header stacks or compresses without overlap
  - account/nav block does not compete with title in the first fold
  - homepage hero, gallery, services, contact and quote sections keep readable spacing
  - dashboard top boards stack in order and remain finger-safe
  - forms stay readable with no clipped labels, inputs or buttons
- Capture evidence for each device:
  - first fold screenshot
  - one gallery interaction screenshot
  - one dashboard top-board screenshot
  - one quote/contact form screenshot

### 2. Runtime asset optimization

- Add a scripted asset pipeline using `sharp`:
  - input: `title.png`, `logo.png`, `logo4.png`, gallery runtime images
  - output: `avif`, `webp`, and original fallback
  - preserve originals as source assets; use optimized variants at runtime
- Header brand assets:
  - render through `<picture>` with `avif -> webp -> png` fallback
  - add explicit `width` and `height`
  - tune CSS so the optimized assets reduce layout shift on mobile
- Gallery assets:
  - optimize only the images actually used by public runtime first, not every archive file
  - generate large and mobile-friendly variants for each referenced image
  - update gallery/public page data so each image carries:
    - fallback source
    - `webp`
    - `avif`
    - `width`
    - `height`
- Keep static caching aligned with this:
  - HTML: short/no long cache
  - CSS/JS: moderate cache
  - optimized image variants: long cache

### 3. Richer dark-gold tuning

- Keep the fixed contrast rule:
  - light background -> dark text
  - dark background -> gold text
- Tune only semantic dark-surface tokens, not scattered hardcoded colors:
  - `--ll-text-on-dark`
  - `--ll-text-on-dark-strong`
  - `--ll-text-on-dark-muted`
  - `--ll-accent-gold`
  - `--ll-accent-gold-soft`
- Shift the palette from the current darker bronze toward a richer premium gold:
  - base dark-surface text around `#c4a05f`
  - stronger headings/highlights around `#ddb574`
  - muted text as the same hue at lower opacity
  - accents/buttons/borders slightly deeper than the heading gold, not brighter
- Apply the new gold only through shared tokens in public/workspace CSS so all dark panels move together.
- Acceptance target:
  - richer than the current bronze
  - still premium and restrained
  - readable on black/graphite without drifting into bright yellow

## Public APIs / Interfaces

- No public backend API change.
- Internal frontend/media contract change:
  - public gallery and brand assets should expose optimized sources plus intrinsic dimensions
  - gallery data should support per-image optimized variants instead of a single JPG/PNG path

## Test Plan

- After implementation:
  - `npm run verify:generated`
  - `npm run test:ci`
  - `npm run test:e2e:mobile`
- Manual live QA:
  - desktop full width
  - phone at roughly `390px`
- Pass criteria:
  - `/healthz` still succeeds after deploy
  - no horizontal scroll on phone
  - header proportions are balanced
  - gallery remains functional after optimized asset swap
  - dashboards still load top-board summaries correctly
  - richer gold is visually consistent across homepage, auth and both dashboards

## Assumptions

- Use the automated `sharp` pipeline as the default asset strategy.
- Optimize only runtime-critical gallery images in this pass; archive-only images can stay for a later batch.
- Gold direction is the chosen `richer gold`, not darker bronze.
- When execution starts, save this plan into `Plans/`, append `Plans/Plan History.md`, log issues in `Project_todos.md`, log executed work in `Project_Dev_plan.md`, and finish with commit + push as required by the repo rules.
