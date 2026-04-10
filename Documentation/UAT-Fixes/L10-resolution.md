DEFECT ID: L10
TITLE:
Increase toast/feedback visibility duration
ORIGINAL ISSUE:
Transient success feedback disappeared too quickly to read comfortably.
ROOT CAUSE:
The dismissal timers were set to short durations.
IMPLEMENTATION:
Increased the feedback widget auto-close delay and extended mindmap completion feedback visibility.
FILES MODIFIED:
- frontend/components/feedback/feedback-widget.tsx
- frontend/app/mindmap/components/graph-view.tsx
BEFORE vs AFTER:
Before: transient feedback closed in about 1.2-1.8 seconds.
After: feedback remains visible for about 3.0-3.2 seconds.
EDGE CASES CONSIDERED:
- No behavior change to submission logic.
- Only timeout values were adjusted.
TESTING NOTES:
Verified via full pnpm test run.
