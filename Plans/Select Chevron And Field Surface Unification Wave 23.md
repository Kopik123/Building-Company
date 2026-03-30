# Select Chevron And Field Surface Unification Wave 23

## Summary
- Goal: give dropdown fields a cleaner brand-consistent chevron while keeping their field surfaces consistent across brochure, auth and workspace shells.
- Scope: refactor shared form-field backgrounds to reusable CSS variables and apply a custom chevron to single-value selects.
- Constraints: preserve native select behavior on mobile and avoid route-specific dropdown hacks.

## Key Changes
- Updated `styles/base.css` so form fields now use shared `--field-surface` / `--field-texture-image` variables instead of hardcoded background shorthands.
- Added a custom gold chevron for single-value selects with `appearance: none`, extra right padding and layered background images.
- Rewired `styles/public.css` and `styles/workspace.css` to override field surfaces through the shared variables, so select arrows stay visible while quote/auth/dashboard surfaces keep their intended textures.

## Test Plan
- Automated: `git diff --check`.
- Automated: focused Playwright for brochure routes plus auth session page after the shared select-style change.
- Manual: live visual check of quote/auth/dashboard dropdown affordances after deploy.

## Assumptions
- Single-value selects benefit from a branded chevron, while multi-select/size-based controls should keep native rendering.
- CSS-variable field surfaces are a better long-term base than repeating `background:` shorthands across multiple style layers.
