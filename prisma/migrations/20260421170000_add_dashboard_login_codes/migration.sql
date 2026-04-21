CREATE TABLE IF NOT EXISTS "DashboardLoginCode" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DashboardLoginCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DashboardLoginCode_email_idx" ON "DashboardLoginCode"("email");
CREATE INDEX IF NOT EXISTS "DashboardLoginCode_expiresAt_idx" ON "DashboardLoginCode"("expiresAt");

