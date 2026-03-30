# Contact Card Layout Refresh Wave 29

## Summary
- Rebuild the public `contact.html` surface so it matches the tighter board-style composition: one heading band, one direct contact strip, one coverage band and three stacked guidance cards.
- Keep the brochure branding and existing navigation/session shell intact while making the contact route feel more intentional and less like a generic two-column filler page.
- Preserve portable CTA routes for quote/account so the page still maps cleanly to future authenticated and native-client journeys.

## Changes
- Replace the old intro-grid + split contact cards with a dedicated contact shell in `contact.html`.
- Add a centered phone/email strip and a compact coverage band with area chips.
- Convert the three contact guidance messages into stacked full-width dark cards with clear CTA placement.
- Add contact-specific responsive layout rules in `styles/public.css` for desktop and mobile.
- Extend Playwright brochure coverage so the new contact-specific shells are asserted explicitly.

## Validation
- `git diff --check`
- `node --check tests/playwright/public-redesign.spec.js`
- `node scripts/run-playwright.js -c tests/playwright/playwright.config.js --grep "core brochure pages render about, services, gallery, contact and quote routes"`

## Notes
- A reusable page-model-driven brochure section system would be a better long-term way to manage page variants like this contact shell.
- That would be worth doing later once more brochure pages converge on shared section types, but it is not worth introducing right now just for this one contact-layout refresh.
