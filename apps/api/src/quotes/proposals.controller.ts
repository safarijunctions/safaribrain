import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { QuotesService } from "./quotes.service";
import { ProposalPdfService } from "./proposal-pdf.service";

// No auth guard by design — a client opens their proposal via a tokenized
// link, no account required, per §5 "mobile, low-bandwidth, WhatsApp-first".
// The token itself (a cuid) is the only credential; it is never guessable
// and is bound to exactly one quote.
@Controller("proposals")
export class ProposalsController {
  constructor(
    private readonly quotes: QuotesService,
    private readonly pdf: ProposalPdfService,
  ) {}

  @Get(":token")
  get(@Param("token") token: string) {
    return this.quotes.getProposalByToken(token);
  }

  @Get(":token/pdf")
  async getPdf(@Param("token") token: string, @Res() res: Response) {
    const proposal = await this.quotes.getProposalByToken(token);
    const buffer = await this.pdf.render(proposal);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=safari-proposal.pdf",
      "Content-Length": buffer.length,
    });
    res.send(buffer);
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
