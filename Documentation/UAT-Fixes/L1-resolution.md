DEFECT ID: L1
TITLE:
Redirect logged-in users away from login/register
ORIGINAL ISSUE:
Authenticated users could still open the login and registration screens.
ROOT CAUSE:
The auth entry pages did not guard against an already-valid session.
IMPLEMENTATION:
Added client-side redirect checks on both auth pages using the shared auth helper.
FILES MODIFIED:
- frontend/app/login/page.tsx
- frontend/app/register/page.tsx
- frontend/lib/auth.ts
BEFORE vs AFTER:
Before: logged-in users could stay on login/register.
After: valid sessions are immediately redirected to /dashboard.
EDGE CASES CONSIDERED:
- Expired tokens no longer count as authenticated.
- Redirect only runs in the browser.
TESTING NOTES:
Validated with frontend auth tests and full pnpm test run.
