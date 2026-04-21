-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'master',
    "platformName" TEXT NOT NULL DEFAULT 'Conext Hub',
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
