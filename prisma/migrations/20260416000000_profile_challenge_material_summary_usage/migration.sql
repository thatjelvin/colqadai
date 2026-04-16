-- Add challenge column to profiles for onboarding step 3
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "challenge" TEXT;

-- Ensure usage_events supports MATERIAL_SUMMARY feature (no schema change needed;
-- the feature column is text, new value is inserted at runtime)
