# Quote Budget Range Expansion Wave 18

## Summary
- Add two lower budget brackets to the shared public quote budget configuration.
- Keep the change in one source of truth so manual and generated brochure quote forms stay aligned.
- Avoid introducing page-specific overrides that would make future mobile/native reuse harder.

## Key Changes
- Extend `brand.js` `budgetRanges` with `GBP 3,000-GBP 6,000` and `GBP 6,000-GBP 8,000`.
- Confirm public quote selects continue to hydrate from `data-brand-budget-select` and do not rely on duplicated hardcoded options.
- Record the change in plan history, active todo tracking and the development log.

## Test Plan
- Run a syntax check for `brand.js`.
- Re-read the updated config to confirm the new budget ranges are present in the shared array.

## Assumptions
- Public quote forms and generated service/location quote forms still populate budget options from `brand.js` via `site.js`.
- Existing API tests do not depend on the exact number of available budget options as long as previously valid values remain unchanged.
