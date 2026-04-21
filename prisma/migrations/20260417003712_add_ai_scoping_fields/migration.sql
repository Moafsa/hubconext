-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('WEBSITE', 'LANDING_PAGE', 'SYSTEM', 'AUTOMATION', 'LOGO', 'OTHER');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "briefing" JSONB,
ADD COLUMN     "contractText" TEXT,
ADD COLUMN     "credentials" TEXT,
ADD COLUMN     "technicalScope" TEXT,
ADD COLUMN     "type" "ProjectType" NOT NULL DEFAULT 'WEBSITE';
