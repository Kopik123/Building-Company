# Live QA Checklist: Desktop And Phone

## Scope

- `/`
- `/auth.html`
- `/client-dashboard.html`
- `/manager-dashboard.html`
- one service page
- one location page

## Desktop

- [ ] Header reads cleanly as a thin `title.png` brand strip with a lower quick-access strip for login and menu.
- [ ] `title.png` stays centred, narrow and does not behave like a large hero board.
- [ ] Homepage first fold has no clipped copy, awkward wrapping or broken spacing.
- [ ] Gallery arrows, project rail and active image/project titles stay visible and aligned.
- [ ] Client and manager top boards feel balanced and equal in visual weight.
- [ ] Gold text on dark panels reads premium and restrained, not bright yellow.

## Phone (~390px)

- [ ] No horizontal scroll on homepage, auth, client dashboard and manager dashboard.
- [ ] Thin `title` bar compresses without overlap and the lower login/menu strip remains readable and tap-safe.
- [ ] Homepage sections keep readable spacing in this order:
  - header
  - login/account
  - projects
  - gallery
  - services
  - contact
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
