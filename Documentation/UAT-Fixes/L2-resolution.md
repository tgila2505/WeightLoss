DEFECT ID: L2
TITLE:
Validate JWT expiry in isLoggedIn()
ORIGINAL ISSUE:
Expired or malformed JWTs still returned true from isLoggedIn().
ROOT CAUSE:
The helper only checked for token presence in localStorage.
IMPLEMENTATION:
Decoded the JWT payload client-side, validated exp, and cleared invalid/expired tokens.
FILES MODIFIED:
- frontend/lib/auth.ts
- frontend/tests/lib/auth.test.ts
BEFORE vs AFTER:
Before: any stored token looked valid.
After: only unexpired JWTs are treated as logged in.
EDGE CASES CONSIDERED:
- Base64url decoding.
- Missing exp claim.
- Malformed tokens.
TESTING NOTES:
Updated auth test fixtures to use a valid JWT-shaped token and reran pnpm test.
