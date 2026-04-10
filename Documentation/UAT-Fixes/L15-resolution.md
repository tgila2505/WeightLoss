DEFECT ID: L15
TITLE:
Replace inline styles with shadcn components
ORIGINAL ISSUE:
The mindmap node card relied heavily on inline styles instead of the project UI primitives.
ROOT CAUSE:
The component predated the shared shadcn styling patterns.
IMPLEMENTATION:
Rebuilt the node card using shadcn Card, Button, and Badge primitives plus utility classes while preserving behavior.
FILES MODIFIED:
- frontend/app/mindmap/components/node-card.tsx
BEFORE vs AFTER:
Before: presentation was mostly driven by inline style objects.
After: the component uses shared UI primitives and class-based styling.
EDGE CASES CONSIDERED:
- Retained status dot coloring as the only dynamic visual value.
- Preserved drag/select/expand interactions.
TESTING NOTES:
Verified with frontend test suite and full pnpm test run.
