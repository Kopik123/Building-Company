# Dropdown Selection Background Readability Wave 22

## Summary
- Goal: fix unreadable dropdown option backgrounds across brochure, auth and workspace forms.
- Scope: apply shared select/option styling in the base form layer so popup lists inherit a stable dark background and readable text.
- Constraints: keep the existing brand palette and avoid route-specific CSS duplication.

## Key Changes
- Added shared `select` dropdown theming in `styles/base.css`, including `color-scheme: dark` for native controls.
- Added explicit `select option` and `select optgroup` background/text styling so expanded option lists stop inheriting broken transparent or OS-default contrast.
- Reset `text-shadow` inside popup options to preserve readability even when parent brochure cards use decorative text shadow.

## Test Plan
- Automated: `git diff --check`.
- Automated: focused Playwright for core brochure routes after the shared form-style change.
- Manual: live visual check on quote/auth/dashboard dropdowns after deploy.

## Assumptions
- A shared base-layer fix is better than patching `quote`, `auth` and dashboard CSS separately.
- Native OS select popups still vary by browser, so the goal is stable readability, not pixel-identical custom dropdown rendering.
