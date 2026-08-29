import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { QuotesService } from "./quotes.service";

// No auth guard by design — a client opens their proposal via a tokenized
// link, no account required, per §5 "mobile, low-bandwidth, WhatsApp-first".
// The token itself (a cuid) is the only credential; it is never guessable
// and is bound to exactly one quote.
@Controller("proposals")
export class ProposalsController {
  constructor(private readonly quotes: QuotesService) {}

  @Get(":token")
  get(@Param("token") token: string) {
    return this.quotes.getProposalByToken(token);
  }

  @Post(":token/accept")
  accept(@Param("token") token: string) {
    return this.quotes.accept(token);
  }

  @Post(":token/request-changes")
  requestChanges(@Param("token") token: string, @Body() body: { note?: string }) {
    return this.quotes.requestChanges(token, body?.note);
  }
}
