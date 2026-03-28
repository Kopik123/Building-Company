# Manager Sticky Header Height Compression Hotfix

## Summary
- Goal: shrink the sticky manager top bar into a compact app header that stays well below 20% of the visible viewport height.
- Scope: manager workspace header layout, desktop account-panel behavior and responsive breakpoints in the shared workspace shell.
- Constraints: keep the existing brand language, preserve hash-based manager navigation and avoid breaking public brochure navigation.

## Key Changes
- Reduce the base manager header height, tighten its internal grid and keep the logo, search and nav in one slim sticky shell instead of a hero-sized block.
- Move the desktop account panel into an anchored dropdown behind the account toggle so account tools no longer permanently consume header height.
- Update tablet/mobile breakpoints so the compact header remains readable without wrapping into oversized multi-row stacks.

## Test Plan
- Automated: run syntax/integrity checks for the affected JavaScript and CSS-adjacent files with `node --check site.js` and `git diff --check`.
- Manual: verify on `manager-dashboard.html` that the sticky header stays compact, the account toggle opens a dropdown on desktop, and narrower widths keep the header below a heavy multi-row shell.

## Assumptions
- The manager workspace may use a different, slimmer sticky header treatment than the public brochure pages as long as the same brand tokens remain visible.
