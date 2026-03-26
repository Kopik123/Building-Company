# Web-v2 Overview Aggregation, Claimed Quote Follow Up Uploads And Mobile API Environment Hardening

## Summary
- Goal: close three open portability/parity gaps by giving `web-v2` one aggregated overview payload, letting claimed/logged-in clients append more quote photos after login, and removing the risky hardcoded production fallback from `mobile-v1`.
- Scope: `api/v2`, `shared/contracts/v2`, `apps/web-v2`, `apps/mobile-v1`, plus the regression coverage that protects the new quote and overview flows.
- Constraints: keep legacy dashboards and guest quote routes working during the rollout, preserve future mobile-app portability, and avoid changing the managed DB-backed gallery or unrelated brochure flows.

## Key Changes
- Add a typed `GET /api/v2/overview` route that aggregates projects, quotes, group/direct threads, notifications, staff-only CRM/material counts and client-safe public services into one reusable dashboard summary contract.
- Rewire the `web-v2` overview screen to consume that single aggregated contract instead of stitching together many separate requests at page load.
- Extend the authenticated `web-v2` quotes surface so claimed/logged-in clients can append follow-up quote photos after the initial submission, with the same total-photo cap enforced server-side.
- Replace the `mobile-v1` implicit production fallback with explicit `local` / `staging` / `production` API-base configuration so future native work cannot silently point at live production by default.
- Stabilise the public quote claim/follow-up browser regressions by separating the claim and follow-up upload panels with dedicated DOM hooks instead of relying on one shared CSS class.

## Test Plan
- Automated:
  - `node --test tests/api-v2/overview-contract.test.js`
  - `node --test tests/api-v2/quotes-rbac-crud.test.js`
  - `npm.cmd run build` in `apps/web-v2`
  - `npm.cmd run test:ci`
  - `npm.cmd run test:e2e:mobile`
- Manual:
  - Verify `/app-v2` overview loads from one request and still shows role-aware summaries for manager and client users.
  - Verify a logged-in/claimed quote can accept more reference photos without replacing the existing saved set.
  - Verify Expo/mobile config now fails fast if no explicit API environment mapping is provided.

## Assumptions
- The aggregated overview route is the right interim source of truth until the broader generated shared contract package is introduced.
- Logged-in quote follow-up photo upload belongs in the same quote detail surface as the original attachments rather than a separate portal step.
- `mobile-v1` should now require explicit environment configuration instead of quietly assuming production.
