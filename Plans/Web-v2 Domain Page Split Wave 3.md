# Web-v2 Domain Page Split Wave 3

## Summary
- Goal: continue the authenticated-app refactor by replacing the grouped `projects-quotes`, `messaging` and `operations` page modules with individual domain page files.
- Scope: keep route behavior and contracts unchanged while reducing file size, tightening module ownership and making the next hook/subsection extraction wave smaller and safer.
- Constraints: preserve `/app-v2` behavior, keep the current route metadata contract in `routeConfig.jsx`, and validate the split with the full `web-v2` Playwright rollout grep.

## Key Changes
- Split grouped `web-v2` page modules into individual files for `projects`, `quotes`, `private-inbox`, `messages`, `notifications`, `crm`, `inventory` and `service-catalogue`.
- Repoint `apps/web-v2/src/workspace/routeConfig.jsx` to the new per-domain page modules so route ownership matches page ownership directly.
- Remove the old grouped page files once the individual modules are in place and validated.
- Record the next follow-up honestly: the page-level split is done, and the remaining work is extracting shared hooks plus breaking still-large pages into smaller list/detail/editor modules.

## Test Plan
- Automated: `npm.cmd run build` in `apps/web-v2`.
- Automated: `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "web-v2"`.
- Manual: no extra manual pass in this wave because the browser rollout suite already covers overview, inbox, project chat, manager operations and client quote flows.

## Assumptions
- Page-level module boundaries are the safest next cut before deeper hook extraction.
- Keeping the current `kit.jsx` shared helper layer is acceptable for this wave; the next wave can reduce page-local import breadth and extract domain hooks.
