DEFECT ID: L12
TITLE:
Smooth countdown format transition
ORIGINAL ISSUE:
The countdown changed string format when crossing under one hour, causing a visible jump.
ROOT CAUSE:
The formatter switched from HH:MM:SS to MM:SS based on remaining time.
IMPLEMENTATION:
Standardized the timer display to always use HH:MM:SS.
FILES MODIFIED:
- frontend/app/funnel/preview/components/countdown-timer.tsx
BEFORE vs AFTER:
Before: the timer format changed at runtime.
After: the timer format remains stable throughout the countdown.
EDGE CASES CONSIDERED:
- Expired state now also uses the same three-part format.
TESTING NOTES:
Verified in code and with full pnpm test run.
