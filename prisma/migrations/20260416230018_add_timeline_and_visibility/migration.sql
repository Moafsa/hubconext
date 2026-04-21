-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "isVisibleToClient" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProjectHistory" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectHistory" ADD CONSTRAINT "ProjectHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
