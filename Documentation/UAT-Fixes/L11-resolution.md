DEFECT ID: L11
TITLE:
Improve mobile navigation usability
ORIGINAL ISSUE:
Mobile nav items were cramped with small tap targets and limited spacing.
ROOT CAUSE:
The bottom nav used tighter height, padding, and label width constraints.
IMPLEMENTATION:
Increased mobile nav height, width, spacing, active states, and tappable area for each item.
FILES MODIFIED:
- frontend/app/components/nav-bar.tsx
BEFORE vs AFTER:
Before: compact buttons were harder to tap accurately on mobile.
After: buttons have larger tap targets, clearer spacing, and better active-state contrast.
EDGE CASES CONSIDERED:
- Preserved horizontal scrolling for the full nav set.
- Kept desktop navigation unchanged.
TESTING NOTES:
Verified through component rendering and full pnpm test run.
