-- Add optional phone field to User (telefone)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

