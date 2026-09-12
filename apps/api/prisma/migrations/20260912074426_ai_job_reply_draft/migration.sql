-- AlterTable
ALTER TABLE "ai_jobs" ADD COLUMN     "requestId" TEXT;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "enquiry_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
