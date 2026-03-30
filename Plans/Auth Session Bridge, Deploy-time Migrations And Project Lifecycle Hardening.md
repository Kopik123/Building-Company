# Auth Session Bridge, Deploy-time Migrations And Project Lifecycle Hardening

## Summary
- Goal: close the highest-signal remaining engineering TODOs around session portability, deploy safety, and manager project lifecycle coverage without breaking the live legacy/public flows.
- Scope: bridge legacy auth with `api/v2` sessions, move schema/index ownership out of app boot and into explicit deploy tooling, document the local Postgres bootstrap path, add the current design source-of-truth doc, and extend `web-v2` manager project lifecycle actions.
- Constraints: keep legacy dashboards and public auth online during the transition, preserve future Android/iOS portability through reusable API/session contracts, and avoid any rewrite that would delay the rollout.

## Key Changes
- Add a shared token/session utility so legacy auth routes and `api/v2` auth routes can issue compatible session payloads for both legacy pages and `web-v2`.
- Sync browser-side auth storage across `runtime.js`, `auth.js`, `site.js`, and `apps/web-v2/src/lib/api.js` so login, refresh, logout, and account bootstrap keep both surfaces in step during the cutover period.
- Remove automatic migration execution from app startup, add a deliberate `npm run ensure:indexes` path, and document the deploy sequence as `npm ci -> npm run migrate -> npm run ensure:indexes -> pm2 restart`.
- Add a documented local Postgres Compose bootstrap path for the full app/runtime flow and create the new current web design source-of-truth markdown.
- Extend `web-v2` project management with richer manager lifecycle/archive/delete actions and backend guards so more project operations no longer depend on legacy-only dashboard flows.

## Test Plan
- Automated: `node --test tests/api-v2/auth-flow.test.js`, `node --test tests/api-v2/legacy-auth-session-bridge.test.js`, `node --test tests/api-v2/ensure-indexes-script-env.test.js`, `node --test tests/api-v2/projects-rbac-lifecycle.test.js`, `npm.cmd run build` in `apps/web-v2`, `npm.cmd run test:ci`, `npm.cmd run test:e2e:mobile`.
- Manual: verify legacy login/logout, `web-v2` login/logout/refresh, deploy flow with explicit `migrate` + `ensure:indexes`, and manager lifecycle actions under `/app-v2/projects`.

## Assumptions
- A session bridge is the right near-term move even though a single auth/session system would be cleaner later; it reduces cutover risk today while keeping native-app portability intact.
- Explicit deploy-time migrations and index setup are safer than boot-time schema mutation now that staging/production flow is getting more serious.
- A generated `TypeScript + Zod` or `OpenAPI` package is still the better long-term source of truth, but the current step is to stabilize shared contracts and deployment behavior first.
