DEFECT ID: L14
TITLE:
Prevent invalid (<=0) age/height/weight inputs
ORIGINAL ISSUE:
Funnel step 1 accepted invalid zero/negative values while typing.
ROOT CAUSE:
Numeric fields relied on native min attributes without sanitizing or gating progression.
IMPLEMENTATION:
Sanitized positive numeric input values and disabled the Next action until name, age, height, and weight are valid.
FILES MODIFIED:
- frontend/app/funnel/start/components/funnel-onboarding.tsx
BEFORE vs AFTER:
Before: users could progress with invalid in-memory numeric values.
After: invalid non-positive values are blocked at the UI layer and Next stays disabled.
EDGE CASES CONSIDERED:
- Empty values reset to 0 internally without crashing.
- Existing min/max browser validation remains in place.
TESTING NOTES:
Verified in component logic and full pnpm test run.
