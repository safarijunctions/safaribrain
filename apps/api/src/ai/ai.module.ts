import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { LlmService } from "./llm.service";
import { AiJobsService } from "./ai-jobs.service";
import { AiJobsController } from "./ai-jobs.controller";
import { ReplyDraftsController } from "./reply-drafts.controller";

@Module({
  imports: [AdminModule],
  providers: [LlmService, AiJobsService],
  controllers: [AiJobsController, ReplyDraftsController],
})
export class AiModule {}
