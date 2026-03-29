# Web-v2 First Authenticated Web Policy Wave 13

## Summary
- Goal: close the open repo policy todo that says new authenticated web work must land in `apps/web-v2` first.
- Scope: `README.md`, technical architecture docs, and compatibility markers in `auth.html`, `client-dashboard.html`, and `manager-dashboard.html`.
- Constraints: no runtime cutover in this wave; legacy pages stay online as compatibility entry shells until the remaining parity work is done.

## Key Changes
- Add an explicit repo-facing `web-v2 first` policy to `README.md`, including when legacy edits are still acceptable.
- Extend the technical architecture documentation so authenticated web ownership is unambiguous: `apps/web-v2` is canonical, legacy HTML surfaces are compatibility-only.
- Mark the three legacy authenticated HTML entrypoints with compatibility comments so future edits do not accidentally treat them as the primary product surface.
- Close the corresponding `Project_todos.md` policy item and record the wave in `Project_Dev_plan.md`.

## Test Plan
- Run `git diff --check` to ensure the documentation/HTML comment changes are clean.
- Manually verify the touched files clearly state the same policy without contradicting existing cutover docs.

## Assumptions
- A documentation-and-source-policy wave is enough to close this particular todo because the codebase already routes new authenticated work into `apps/web-v2`.
