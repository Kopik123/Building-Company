# Project Web Design Plan

## Purpose

- This file is the current design source of truth for the web product.
- `Project_todos.md` tracks open design and engineering issues.
- `Project_Dev_plan.md` records completed implementation work.
- This file defines the active target state for layout, theme, component behavior and future design rollout.

## Product Scope

- Primary product now: responsive web for desktop and mobile browsers.
- Future product requirement: Android/iOS app.
- Design decisions on web should stay portable to future native app surfaces.

## Brand Direction

- Brand: `Level Lines Studio`
- Tone: premium, restrained, architectural, high-standard
- Visual language:
  - lines
  - levels
  - symmetry
  - elegance
  - professionalism
  - quiet luxury

## Theme Rules

- Base palette:
  - black / graphite backgrounds
  - white / stone / marble surfaces
  - dark gold accents, borders and dark-surface typography
- Fixed contrast rule:
  - light background -> dark text
  - dark background -> gold text
- Gold direction:
  - richer premium gold
  - not yellow
  - not pale beige
  - not bronze-heavy unless used for a deeper accent

## Header System

- Shared shell on public and workspace pages:
  - left: `logo`
  - center: `title`
  - right: `Account` + primary nav/menu
- Header must remain balanced on:
  - desktop wide screens
  - tablet widths
  - phone widths around `390px`
- Title image must never overpower the account/nav block.

## Public Information Architecture

- Primary navigation:
  - `About Us`
  - `Gallery`
  - `Contact`
  - `Quote`
  - `Account`
- Homepage order on mobile:
  - header
  - login/account
  - projects
  - gallery
  - services
  - contact
  - quote
- Service and location pages remain SEO pages, but should stay visually inside the same premium shell.

## Workspace Structure

- Manager dashboard top board:
  - `Company Events`
  - `Mail Box`
  - `Available Options`
- Client dashboard top board:
  - `Project Status`
  - `Mail Box`
  - `Available Options`
- Workspace should feel operational and premium, but less marketing-led than public pages.

## Asset Strategy

- Runtime-critical brand and gallery assets should use optimized formats:
  - `avif`
  - `webp`
  - original fallback only where needed
- Preferred runtime delivery:
  - `<picture>`
  - explicit intrinsic `width` and `height`
  - optimized variants served first
- Originals remain source assets, not preferred runtime payloads.

## Responsive Rules

- No horizontal scroll on key pages.
- Priority breakpoints:
  - `<= 390`
  - `391-640`
  - `641-992`
  - `993+`
- Mobile corrections must prioritise:
  - header proportions
  - first-fold spacing
  - gallery/project panels
  - quote/contact form readability
  - dashboard top-board stacking

## Typography

- Display headings:
  - `Cormorant Garamond`
- UI/body:
  - `Montserrat`
- Typography should stay deliberate and premium, but mobile sizes must avoid oversized first-fold blocks.

## Current Design Priorities

- Keep the dark-gold premium shell consistent across homepage, auth, client dashboard and manager dashboard.
- Continue reducing first-paint weight by replacing heavy runtime imagery with optimized variants.
- Keep generated public pages aligned with manual pages through shared renderer logic, not one-off edits.

## Next Design Rollout

- Final live QA on desktop and phone after each visual pass.
- Continue moving layout responsibility from `styles/base.css` into `styles/public.css` and `styles/workspace.css`.
- Keep refining public pages so they follow the same structural language without turning them into dashboard-like layouts.
- Prepare all major UI flows so they can map cleanly into future Android/iOS screens.
