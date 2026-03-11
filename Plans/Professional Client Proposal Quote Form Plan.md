# Professional Client Proposal Quote Form Plan

## Summary

- Scope:
  redesign the public `Quote` intake into a more professional `client_proposal_quote` flow that still fits the current web app and future Android/iOS app rollout.
- Goal:
  collect better project qualification data at the first enquiry stage without making the form feel heavy, while keeping the backend contract portable and manager-friendly.
- Out of scope:
  no immediate backend schema migration, no manager workflow rewrite, and no change to the existing quote submission route in this planning step.

## Key Changes

- Area 1:
  keep the public quote page copy direction already in place:
  - title: `Send one private enquiry for bathrooms, kitchens and interior renovation briefs.`
  - supporting copy: `Use one private enquiry route for bathroom, kitchen and interior briefs, then describe the rooms, timing and finish ambition.`
- Area 2:
  split the future form into clear data groups for `client_proposal_quote`:
  - identity:
    - full name
    - email
    - phone
    - preferred contact method
  - project basics:
    - project type
    - property postcode
    - property city / area
    - property type
    - occupancy status during works
  - scope:
    - rooms involved
    - scope type: refresh / partial refurb / full renovation
    - services required
    - structural or layout changes
  - finish direction:
    - finish ambition level
    - preferred material direction
    - reference inspiration upload or links
  - timing and budget:
    - ideal start window
    - timing flexibility
    - budget band
    - decision status / whether planning is already approved
  - proposal notes:
    - client brief
    - access constraints
    - anything the studio should know before first reply
- Area 3:
  introduce a phased UX so the form still feels premium and calm:
  - step 1: identity + project type
  - step 2: rooms, scope and services
  - step 3: timing, budget and detailed brief
  - step 4: review + submit
- Area 4:
  define `client_proposal_quote` as a first-class portable data shape for web and later Android/iOS:
  - keep the current guest quote endpoint as the initial transport
  - introduce a frontend mapper from rich form data to current payload now
  - plan a later backend expansion so richer fields are stored as structured data, not only a long free-text message
- Area 5:
  make the manager/admin side easier to triage:
  - summary card in manager quotes list should show:
    - project type
    - location
    - rooms involved
    - timing window
    - finish ambition
    - budget band
  - create a visible intake score / completeness indicator so managers can prioritise better enquiries first

## Public APIs / Interfaces

- Routes:
  - keep `POST /api/quotes/guest` in phase 1
  - plan a future richer endpoint or payload version for structured quote intake when schema work starts
- UI contracts:
  - quote page remains the single public entry point for bathrooms, kitchens and interior briefs
  - form should support both desktop and mobile without changing field meaning between platforms
  - stepper, labels, validation states and summary review should map cleanly to web and native app UI
- Data contracts:
  - current minimal payload:
    - `name`
    - `email`
    - `phone`
    - `location`
    - `projectType`
    - `budgetRange`
    - `description`
    - `postcode`
  - planned `client_proposal_quote` shape:
    - `contact`
    - `project`
    - `scope`
    - `finish`
    - `timing`
    - `budget`
    - `attachments`
    - `notes`
  - until backend expansion lands, extra structured fields should be serialised safely into the description block or a mapped metadata payload

## Test Plan

- Generation / build:
  - if quote page copy or generated public pages change, run `npm run verify:generated`
- Automated tests:
  - extend Playwright coverage for the quote page with:
    - desktop form completion
    - mobile multi-step flow
    - validation states
    - success message handling
  - add API tests for richer quote payload mapping once backend support exists
- Manual checks:
  - test quote flow on desktop and mobile
  - check manager quote list readability after richer intake fields are surfaced
  - confirm the form still feels concise and premium, not bureaucratic
- Acceptance criteria:
  - the public user can submit a professional first brief without confusion
  - managers receive enough structured context to judge fit, timing and proposal readiness
  - the data model is portable to a future Android/iOS app without redesigning the field schema again

## Assumptions

- the quote page remains a single premium route, not separate forms per service
- the current copy direction on `quote.html` is already close to the desired brand tone and should stay the baseline
- future Android/iOS support means the form model must be transportable and not depend on browser-only behaviour
