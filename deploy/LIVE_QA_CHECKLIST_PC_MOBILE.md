# Live QA Checklist: Desktop And Phone

## Scope

- `/`
- `/services.html`
- `/auth.html`
- `/client-dashboard.html`
- `/manager-dashboard.html`
- one service page
- one location page
- one legal page

## Desktop

- [ ] Header reads cleanly as a sticky `title.png` brand strip with a compact login/menu control area.
- [ ] `title.png` stays centred, narrow and does not behave like a large hero board.
- [ ] `services.html` reads as a clear hub page instead of a duplicated homepage fragment.
- [ ] Homepage first fold has no clipped copy, awkward wrapping or broken spacing.
- [ ] Gallery arrows, project rail and active image/project titles stay visible and aligned.
- [ ] Client and manager top boards feel balanced and equal in visual weight.
- [ ] Gold text on dark panels reads premium and restrained, not bright yellow.

## Phone (~390px)

- [ ] No horizontal scroll on homepage, auth, client dashboard and manager dashboard.
- [ ] Thin sticky `title` bar compresses without overlap and the compact login/menu controls remain readable and tap-safe.
- [ ] Homepage sections keep readable spacing in this order:
  - sticky header
  - intro
  - services
  - gallery
  - process / trust
  - contact CTA
  - quote
- [ ] Client and manager top boards stack in a clean, tap-safe order.
- [ ] Forms keep visible labels, inputs and buttons with no clipped text.

## Screenshot Evidence

- [ ] Homepage first fold on desktop
- [ ] Homepage first fold on phone
- [ ] One gallery interaction
- [ ] Manager dashboard top board
- [ ] Client dashboard top board
- [ ] One quote/contact form

## Runtime Checks

- [ ] `curl -sS https://levellines.co.uk/healthz`
- [ ] Optimized brand images load through `<picture>` sources
- [ ] Gallery still rotates and the project rail still changes the active image sequence
