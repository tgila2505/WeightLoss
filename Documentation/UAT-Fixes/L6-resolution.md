DEFECT ID: L6
TITLE:
Clarify pricing copy
ORIGINAL ISSUE:
Pricing language across the funnel could be read as free access to the full plan or unclear post-trial billing.
ROOT CAUSE:
Multiple funnel surfaces mixed preview/free language with paid full-plan messaging.
IMPLEMENTATION:
Standardized copy to distinguish the free preview from the paid full-plan trial and recurring billing.
FILES MODIFIED:
- frontend/app/funnel/components/funnel-hero.tsx
- frontend/app/funnel/components/cost-anchor.tsx
- frontend/app/funnel/page.tsx
- frontend/app/funnel/preview/components/locked-plan-preview.tsx
- frontend/app/funnel/upgrade/components/upgrade-form.tsx
- frontend/app/funnel/upgrade/components/value-recap.tsx
- frontend/app/funnel/welcome/page.tsx
BEFORE vs AFTER:
Before: copy implied broader free access and inconsistent trial messaging.
After: copy consistently states preview is free and full-plan billing begins after a 7-day trial unless cancelled.
EDGE CASES CONSIDERED:
- Kept the existing pricing amount.
- Avoided changing payment logic or checkout flow.
TESTING NOTES:
Verified copy paths manually and reran pnpm test.
