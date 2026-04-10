DEFECT ID: L5
TITLE:
Improve welcome-screen contrast
ORIGINAL ISSUE:
The welcome screen used low-contrast supporting text for key billing/trial messaging.
ROOT CAUSE:
Secondary copy relied on lighter slate text that reduced readability.
IMPLEMENTATION:
Raised the supporting copy contrast on the funnel welcome screen.
FILES MODIFIED:
- frontend/app/funnel/welcome/page.tsx
BEFORE vs AFTER:
Before: supporting text used lighter, lower-contrast styling.
After: supporting text uses darker, more readable contrast.
EDGE CASES CONSIDERED:
- Preserved existing hierarchy.
- Kept emphasis on the primary CTA.
TESTING NOTES:
Verified visually in code and with full pnpm test run.
