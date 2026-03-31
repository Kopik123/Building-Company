# Security Hotspot Remediation - ReDoS, Injection And SRI

## Summary

- Scope: remove the flagged regex DoS hotspots, replace the unsafe HTML injection fallback, and mitigate the flagged missing-SRI external resource usage.
- Goal: close the current low-priority security review findings with the smallest safe code changes.
- Out of scope: full site-wide font hosting migration or broader dependency/security refactors outside the flagged hotspots.

## Key Changes

- Area 1: ReDoS-safe input checks
  - Replace the risky auth-link text regex in the public shell script with normalized string matching.
  - Replace regex-based contact email validation with bounded string-based validation.
- Area 2: Unsafe dynamic HTML injection
  - Remove the `innerHTML` fallback in manager review overview rendering.
  - Build the fallback card using DOM nodes and `textContent`.
- Area 3: Missing SRI external resources
  - Remove the flagged Google Fonts stylesheet dependency from the affected pages.
  - Let those pages fall back to the existing local serif/sans font stacks already defined in CSS.

## Public APIs / Interfaces

- Routes:
  - `POST /api/contact` keeps the same contract and error responses.
- UI contracts:
  - Auth-link detection still recognises the public account/auth entry point.
  - About/auth pages keep the same structure and local stylesheet loading order.
- Data contracts:
  - No payload shape changes.

## Test Plan

- Generation / build:
  - `npm run verify:generated`
  - `node --check /home/runner/work/Building-Company/Building-Company/main.js`
  - `node --check /home/runner/work/Building-Company/Building-Company/manager-review.js`
- Automated tests:
  - `npm run test:api:v2`
  - `node --test /home/runner/work/Building-Company/Building-Company/tests/security-hardening.test.js`
- Manual checks:
  - Open `/auth.html` and `/about.html` to confirm layout remains readable with fallback fonts.
  - Confirm account/auth links in the public shell still resolve correctly.
- Acceptance criteria:
  - No flagged ReDoS regex remains in the touched areas.
  - No `innerHTML` fallback remains in the touched manager review helper.
  - The flagged external Google Fonts dependency is removed from the affected pages.

## Assumptions

- The security review is targeting the specific affected pages rather than requiring a full site-wide font hosting migration in this slice.
- Existing CSS fallback stacks are acceptable on the touched pages until a broader typography migration is planned.
- Lightweight unit coverage plus the existing API/generated-page checks are sufficient for this remediation pass.
