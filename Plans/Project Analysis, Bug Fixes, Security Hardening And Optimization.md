# Project Analysis, Bug Fixes, Security Hardening And Optimization

## Context

Full audit of the Building-Company project covering logic, security, code quality and deployment pipeline.

## Issues Found And Fixed

### Deployment / Build

- [x] `.do/app.yaml` missing `build_command` — DigitalOcean buildpack didn't know how to build the project
- [x] `apps/web-v2/dist/` build artifacts were committed to git instead of being ignored

### Security

- [x] CORS allowed all origins when `CORS_ORIGINS` env var was empty (production open-by-default)
- [x] Guest claim codes used 6-digit numeric codes (~900K keyspace) — upgraded to 8-char hex (~4.3B)
- [x] No input length limits on quote description/name fields — potential payload abuse / DoS
- [x] `safeUnlink` path traversal check used `path.join` instead of `path.resolve` — symlink bypass risk
- [x] No rate limiting on guest quote creation endpoint — notification flooding risk

### Code Quality

- [x] Frontend claim code inputs/validation updated to match new 8-char hex format
- [x] Test expectations updated for new claim code length
- [x] `apps/web-v2/.gitignore` created to exclude build output

## Remaining Recommendations (Not Implemented — Architectural)

- Add CSRF token protection for state-changing endpoints
- Implement JWT token revocation / logout endpoint with blacklist
- Add account lockout after repeated failed login attempts
- Encrypt PII fields in notification data column
- Add public quote token expiry mechanism
- Replace `'unsafe-inline'` in CSP with nonce-based script loading
- Migrate from multer 1.x to multer 2.x (security warnings)
