DEFECT ID: L3
TITLE:
Clear password field on failed login
ORIGINAL ISSUE:
The password remained visible in the input after a failed sign-in attempt.
ROOT CAUSE:
The login error path set the error message but left the password state intact.
IMPLEMENTATION:
Reset the password state inside the failed login catch branch.
FILES MODIFIED:
- frontend/app/login/page.tsx
BEFORE vs AFTER:
Before: failed login preserved the entered password.
After: failed login clears the password field and keeps the email.
EDGE CASES CONSIDERED:
- Preserved email for quick retry.
- Error messaging remains unchanged.
TESTING NOTES:
Covered by manual code-path verification and full pnpm test run.
