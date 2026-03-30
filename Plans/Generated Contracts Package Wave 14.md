# Generated Contracts Package Wave 14

## Summary
- Goal: close the generated-contract-package todos by promoting the current shared contract layer into a real generated workspace package used by backend, `web-v2`, and mobile foundations.
- Scope: new `packages/contracts-v2`, a generator script, consumer import rewiring, sync tests, and repo bookkeeping.
- Constraints: keep `shared/contracts/v2` as the authoring source for this wave, avoid changing payload semantics, and keep the package portable for future Android/iOS clients.

## Key Changes
- Add `packages/contracts-v2` as a generated workspace package built from `shared/contracts/v2.js` and `shared/contracts/v2.d.ts`.
- Add `scripts/generate-contract-package.js` plus a root `generate:contracts` script so the generated package can be refreshed intentionally.
- Rewire backend routes, `apps/web-v2`, and `packages/mobile-contracts` to consume `@building-company/contracts-v2` instead of importing `shared/contracts/v2` directly.
- Add a sync regression test so the generated package stays byte-for-byte aligned with the authoring contract source apart from the generated banner.

## Test Plan
- Run `node scripts/generate-contract-package.js`.
- Run `npm.cmd install` so the new workspace package is linked in `node_modules` and `package-lock.json` is updated.
- Run `npm.cmd run test:mobile:foundation`, `npm.cmd run test:api:v2`, and `npm.cmd run build` in `apps/web-v2`.

## Assumptions
- Keeping `shared/contracts/v2` as the authoring source is acceptable for now because this wave focuses on packaging and reuse, not on redesigning the contract authoring pipeline.
