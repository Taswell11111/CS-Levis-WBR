# Security Spec

1. Data Invariants:
   - A report cannot be created without a valid authorId matching the authenticated user.
   - A report can only be read by anyone if they know the exact document ID (`get`), `list` is forbidden.
   - User profiles can only be created/updated by the user themselves.

2. Dirty Dozen Payloads:
   - Payload 1: Create report with `authorId` spoofed as another user.
   - Payload 2: Create report without `authorId`.
   - Payload 3: Create report with `createdAt` not equal to `request.time`.
   - Payload 4: Update another user's report.
   - Payload 5: List reports.
   - Payload 6: Create user with `email` not matching `request.auth.token.email`.
   - Payload 7: Update user profile adding a Ghost Field.
   - Payload 8: Create report with massive `authorId` string (>128 chars).
   - Payload 9: Create report as unauthenticated user.
   - Payload 10: Read user profile of another user.
   - Payload 11: Create report missing `data` field.
   - Payload 12: Modify `createdAt` during an update.

3. Test Runner: (Will be implemented in `firestore.rules.test.ts`)
