DEFECT ID: L8
TITLE:
Resolve unknown status for standard lab tests
ORIGINAL ISSUE:
Standard requisition tests could display an unknown evaluation status.
ROOT CAUSE:
The rule engine only knew a small alias/rule set and ignored parseable reference ranges.
IMPLEMENTATION:
Added a safe reference-range fallback evaluator for common formats such as ranges and inequality thresholds.
FILES MODIFIED:
- backend/app/services/lab_rule_engine.py
BEFORE vs AFTER:
Before: many standard tests without hard-coded aliases returned unknown.
After: standard tests with usable reference ranges resolve to normal or abnormal.
EDGE CASES CONSIDERED:
- Supports <, <=, >, >=, and low-high ranges.
- Leaves genuinely unparseable tests as unknown.
TESTING NOTES:
Verified through backend test suite and full pnpm test run.
