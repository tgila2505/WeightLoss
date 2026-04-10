DEFECT ID: L13
TITLE:
Remove dead code (isReadOnlyLabel)
ORIGINAL ISSUE:
Mindmap node rendering contained an always-true isReadOnlyLabel branch and unused editable-label plumbing.
ROOT CAUSE:
Legacy inline-edit support remained in the component even though only read-only rendering was used.
IMPLEMENTATION:
Removed the dead branch and simplified the parent/child node-card contract.
FILES MODIFIED:
- frontend/app/mindmap/components/node-card.tsx
- frontend/app/mindmap/components/graph-view.tsx
BEFORE vs AFTER:
Before: dead conditional paths and unused props remained in production code.
After: only the active read-only path remains.
EDGE CASES CONSIDERED:
- Preserved selection, drag, and expand/collapse behavior.
TESTING NOTES:
Validated by frontend tests and full pnpm test run.
