DEFECT ID: L9
TITLE:
Always show a status badge for lab results
ORIGINAL ISSUE:
Lab result cards only rendered a badge when a result was abnormal.
ROOT CAUSE:
The card UI conditionally rendered the badge for abnormal states only.
IMPLEMENTATION:
Rendered a badge for all result cards and normalized the visible label to Normal, Abnormal, or Unknown.
FILES MODIFIED:
- frontend/app/lab-test/page.tsx
- backend/app/services/lab_rule_engine.py
BEFORE vs AFTER:
Before: normal results had no visible status badge.
After: every result card shows a consistent status badge.
EDGE CASES CONSIDERED:
- Unknown states still render a neutral badge.
- Existing abnormal highlighting remains intact.
TESTING NOTES:
Validated in code and through full pnpm test run.
