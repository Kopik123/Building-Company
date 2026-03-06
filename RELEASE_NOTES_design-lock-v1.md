# RELEASE NOTES - design-lock-v1

Date: 2026-03-06
Status: Production design locked

## Scope
- Restored and standardized premium brand presentation across the website.
- Finalized logo policy to `logo4.png`.
- Completed consistency pass for service pages and legal pages.

## Branding Changes
- Canonical brand name is now `Level + Lines`.
- Deprecated brand strings removed from primary pages.
- Header/footer brand assets aligned around `logo4.png`.

## Homepage
- Premium consultation CTA standardized: `Request private consultation`.
- Footer branding and legal links aligned with the new brand baseline.

## Service Pages
- `premium-bathrooms-manchester.html`
  - Brand metadata aligned to `Level + Lines`.
  - Header/footer logo switched to `logo4.png`.
  - CTA text standardized.
- `premium-kitchens-manchester.html`
  - Brand metadata aligned to `Level + Lines`.
  - Header/footer logo switched to `logo4.png`.
  - CTA text standardized.

## Legal Pages
- `privacy.html`, `cookie-policy.html`, `terms.html`
  - Metadata and in-page references aligned to `Level + Lines`.

## Deployment Script
- `deploy/setup-droplet.sh`
  - Supports dependency install fallback (`npm ci --omit=dev` with `npm install --omit=dev` when needed), retained in current baseline.

## Added Documents
- `DESIGNER_BRIEF_LEVELLINES.md`
- `RELEASE_NOTES_design-lock-v1.md`

## Lock Policy
- Design is locked at `design-lock-v1`.
- Only critical fixes or explicitly approved copy/content updates should be introduced after this point.
