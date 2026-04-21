-- Add new role value for agency administrators
DO $$
BEGIN
  -- Postgres 15 supports IF NOT EXISTS here
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AGENCY_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN
    -- Older Postgres versions or repeated migration runs
    NULL;
END $$;

-- Add optional "position" (cargo) to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "position" TEXT;

