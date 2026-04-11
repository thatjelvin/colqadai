-- One-time cleanup for Supabase ghost users that block Google OAuth auto-linking.
-- IMPORTANT: Run the SELECT first and verify no legitimate unconfirmed users are included.

SELECT id, email, created_at, raw_app_meta_data
FROM auth.users
WHERE email_confirmed_at IS NULL
  AND raw_app_meta_data->>'provider' = 'email'
ORDER BY created_at DESC;

-- Run only after manual verification of the rows above.
DELETE FROM auth.users
WHERE email_confirmed_at IS NULL
  AND raw_app_meta_data->>'provider' = 'email';
