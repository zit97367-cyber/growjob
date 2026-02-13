-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ATS', 'BOARD_API');

-- AlterTable
ALTER TABLE "Company"
  ADD COLUMN "isConfigVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Job"
  ADD COLUMN "sourceType" "SourceType" NOT NULL DEFAULT 'ATS',
  ADD COLUMN "sourceProvider" TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "sourceReliability" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "IngestRun" (
  "id" TEXT NOT NULL,
  "companiesProcessed" INTEGER NOT NULL DEFAULT 0,
  "jobsSeen" INTEGER NOT NULL DEFAULT 0,
  "jobsUpserted" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IngestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestSourceRun" (
  "id" TEXT NOT NULL,
  "ingestRunId" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "seen" INTEGER NOT NULL DEFAULT 0,
  "upserted" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IngestSourceRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_sourceProvider_idx" ON "Job"("sourceProvider");
CREATE INDEX "IngestSourceRun_ingestRunId_idx" ON "IngestSourceRun"("ingestRunId");
CREATE INDEX "IngestSourceRun_sourceName_idx" ON "IngestSourceRun"("sourceName");

-- AddForeignKey
ALTER TABLE "IngestSourceRun"
  ADD CONSTRAINT "IngestSourceRun_ingestRunId_fkey"
  FOREIGN KEY ("ingestRunId") REFERENCES "IngestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
