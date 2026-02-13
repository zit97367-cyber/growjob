-- CreateEnum
CREATE TYPE "JobCategory" AS ENUM (
  'AI',
  'BACKEND',
  'FRONT_END',
  'CRYPTO',
  'NON_TECH',
  'DESIGN',
  'MARKETING',
  'DATA_SCIENCE',
  'OTHER'
);

-- AlterTable
ALTER TABLE "Job"
  ADD COLUMN "salaryMinUsd" INTEGER,
  ADD COLUMN "salaryMaxUsd" INTEGER,
  ADD COLUMN "salaryInferred" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "jobCategory" "JobCategory" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "AtsScan"
  ADD COLUMN "matchProbability" INTEGER,
  ADD COLUMN "matchReason" TEXT,
  ADD COLUMN "detailedSuggestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Job_jobCategory_idx" ON "Job"("jobCategory");
CREATE INDEX "Job_salaryMinUsd_idx" ON "Job"("salaryMinUsd");
