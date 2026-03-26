# Current Web Design Source Of Truth

## Purpose

This file replaces the removed `Project_Web_Design_Plan.md` as the current visual/product source of truth for the live website and workspace shell.

## Brand Direction

- Public shell uses `title.png` as the primary lockup.
- Card and section surfaces should feel premium, warm and architectural rather than generic SaaS.
- `mainbackground.png` is the primary card/section background.
- `boxbackground.png` is reserved for field-style, inset and input-like surfaces.
- Gold text remains part of the brand language, but readability on light surfaces must always win over stylistic consistency.

## Public Site Rules

- Homepage, services, gallery, quote and contact must feel like one premium brochure journey, not disconnected landing pages.
- The gallery is service-led and folder-driven; raw service folders are the source of truth for gallery group names and ordering.
- Public quote flow is now part of the product, not just a brochure CTA:
  - multi-photo upload
  - immediate thumbnail preview
  - private quote preview link
  - guest follow-up uploads
  - quote claim handoff into account auth
- Public pages should keep helper copy minimal and action-led.

## Workspace Rules

- `apps/web-v2` is the target authenticated web surface.
- Legacy dashboards remain compatibility surfaces during the transition, but new authenticated feature work should land in `web-v2` first unless explicitly legacy-only.
- Overview, messaging, quotes and project operations should be portable to future Android/iOS clients, so UI flows must reflect reusable API contracts rather than DOM-only coupling.

## UX Priorities

- Desktop and mobile must both preserve the single dominant-card feel on brochure pages.
- No horizontal overflow on phone breakpoints.
- Auth/session state must be visible and unambiguous in the public shell.
- Manager quick access labels stay canonical across public shell, auth shell and workspace shells.

## Open Visual Risks To Keep Checking

- Gold text readability on lighter cards.
- Background split consistency between `mainbackground.png` and `boxbackground.png`.
- Gallery preview balance on narrower desktop widths.
- Session/account shell clarity after auth/session unification work continues.
