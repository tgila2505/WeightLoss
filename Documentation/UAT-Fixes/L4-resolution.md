DEFECT ID: L4
TITLE:
Align login/register theme with funnel experience
ORIGINAL ISSUE:
Login and registration screens looked visually disconnected from the funnel flow.
ROOT CAUSE:
Auth pages used a separate plain layout instead of the funnel-style visual treatment.
IMPLEMENTATION:
Introduced a shared AuthCardShell with the same gradient/background treatment and reused it across login/register.
FILES MODIFIED:
- frontend/app/components/auth-card-shell.tsx
- frontend/app/login/page.tsx
- frontend/app/register/page.tsx
BEFORE vs AFTER:
Before: auth pages used a generic flat slate background.
After: auth pages match the funnel visual system and card styling.
EDGE CASES CONSIDERED:
- Shared component keeps both pages consistent.
- Existing auth form logic and accessibility preserved.
TESTING NOTES:
Verified through page rendering tests and full pnpm test run.
