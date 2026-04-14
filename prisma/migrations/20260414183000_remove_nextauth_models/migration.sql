-- Remove legacy NextAuth tables after migration to Clerk auth.
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";
