DEFECT ID: L7
TITLE:
Add Back button to funnel step 1
ORIGINAL ISSUE:
Users could advance from step 1 but could not navigate back to the funnel landing page.
ROOT CAUSE:
Step 1 only exposed a Next action.
IMPLEMENTATION:
Added a Back action on step 1 that returns users to /funnel.
FILES MODIFIED:
- frontend/app/funnel/start/components/funnel-onboarding.tsx
BEFORE vs AFTER:
Before: step 1 trapped users in the onboarding flow unless they used browser navigation.
After: step 1 includes an in-flow Back button.
EDGE CASES CONSIDERED:
- Preserved steps 2 and 3 back behavior.
- Did not alter session creation timing.
TESTING NOTES:
Verified component logic and full pnpm test run.
