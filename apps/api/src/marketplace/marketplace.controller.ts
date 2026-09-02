import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { MarketplaceEnquiryDto } from "./dto/marketplace-enquiry.dto";

// No auth guard by design, same reasoning as ProposalsController/
// BookingsPublicController — a prospective traveler browses without an
// account, per §5 "mobile, low-bandwidth, WhatsApp-first" and §7's
// marketplace phase.
@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("templates")
  list(@Query("country") country?: string) {
    return this.marketplace.listTemplates(country);
  }

  @Get("templates/:id")
  get(@Param("id") id: string) {
    return this.marketplace.getTemplate(id);
  }

  @Post("templates/:id/enquire")
  enquire(@Param("id") id: string, @Body() dto: MarketplaceEnquiryDto) {
    return this.marketplace.enquire(id, dto);
  }
}
