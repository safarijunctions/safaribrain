-- CreateEnum
CREATE TYPE "AiJobKind" AS ENUM ('ITINERARY_DRAFT', 'PROPOSAL_REWRITE', 'TRANSLATION', 'FEE_EXTRACTION', 'NEWS_SUMMARY', 'REPLY_DRAFT');

-- CreateEnum
CREATE TYPE "AiJobApprovalStatus" AS ENUM ('DRAFTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "AiJobKind" NOT NULL,
    "status" "AiJobApprovalStatus" NOT NULL DEFAULT 'DRAFTED',
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "requestedById" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "resultEntityType" TEXT,
    "resultEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_jobs_organizationId_kind_status_idx" ON "ai_jobs"("organizationId", "kind", "status");

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
