# 2 Aplikacje Mobilne Android Dla Level Lines

## Summary
- Goal: split the future Android surface into two dedicated Expo apps, one for clients and one for company staff, without breaking the current server deploy flow.
- Scope: introduce `apps/mobile-client`, `apps/mobile-company`, shared mobile workspaces (`packages/mobile-contracts`, `packages/mobile-core`, `packages/mobile-ui`), mobile-ready `api/v2` auth onboarding, and device push metadata for app-variant aware registration.
- Constraints: keep the current repo on `npm`, avoid dragging Expo runtime dependencies into production server installs, and keep API/session/media contracts portable for later iOS support.

## Key Changes
- Added `npm` workspaces for shared mobile packages and both new Expo app shells, while keeping `apps/mobile-v1` as the prototype/seed rather than the production target.
- Added `packages/mobile-contracts` as the first dedicated mobile contract layer on top of `shared/contracts/v2`, including mobile session, route and push registration source-of-truth types.
- Added `packages/mobile-core` for API access, quote payload building, session helpers and portable polling/resource hooks, plus `packages/mobile-ui` for shared React Native surface components.
- Added `apps/mobile-client` with client-only auth gating, public quote submit, guest claim handoff and logged-in tabs for overview, quotes, projects, inbox, notifications and account.
- Added `apps/mobile-company` with company-only auth gating and the first operational tabs for overview, projects, quotes, estimates, inbox, notifications, CRM, inventory and account.
- Extended `/api/v2/auth` with a dedicated client `register` endpoint so native onboarding no longer depends on legacy-only auth routes.
- Extended `DevicePushTokens` and `/api/v2/devices/push-token` with `appVariant`, `deviceName` and Expo-friendly provider support, ready for later native push registration.

## Test Plan
- Automated:
  - `node --test tests/api-v2/auth-flow.test.js`
  - `node --test tests/api-v2/devices-push-registration.test.js`
  - `node --test tests/mobile/mobile-foundation.test.js`
  - `npm.cmd run test:ci`
- Manual:
  - start `apps/mobile-client` and `apps/mobile-company` via the new root workspace scripts
  - verify client-role login/register vs company-role login gating
  - verify mobile quote submit / preview / claim handoff and company quote assignment from real staging/prod-like API environments

## Assumptions
- This foundation wave prioritises the split architecture, shared contracts and working shells first; richer native-only pieces like deep links, persistent session storage and device push token acquisition can now be layered on top instead of being invented ad hoc later.
- Expo remains the fastest way to stand up both Android apps now, even though direct native FCM/APNS wiring would be a stronger long-term push foundation once the product flows stop changing quickly.
- `TypeScript + Zod` is the right mobile contract direction right now; generated `OpenAPI` remains a later optimisation once the guest/public quote and company CRUD flows stabilise.
