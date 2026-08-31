export interface Contact {
  id: string;
  fullName: string;
  email?: string;
  whatsapp?: string;
  country?: string;
}

export interface EnquiryRequestSummary {
  id: string;
  stage: string;
  source: string;
  partySize: number;
  contact: Contact;
  createdAt: string;
  quotes: { id: string; status: string }[];
}

export interface PipelineEvent {
  id: string;
  stage: string;
  note?: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  dueAt?: string;
  completedAt?: string;
}

export interface CostLineDto {
  label: string;
  category: string;
  quantity: number;
  unitCost: number;
  currency: string;
  internal: boolean;
}

export interface PriceBreakdownDto {
  currency: string;
  costLines: CostLineDto[];
  subtotalCost: number;
  markupPercent: number;
  markupAmount: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  commissionAmount: number;
  totalClientPrice: number;
  feeSourcesAsOf: { parkFeeRuleId: string; label: string; asOfDate: string }[];
}

export interface QuoteVersion {
  id: string;
  versionNo: number;
  breakdown: PriceBreakdownDto;
  totalPrice: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  decision: string;
  reason?: string;
  createdAt: string;
}

export interface Quote {
  id: string;
  status: string;
  currency: string;
  versions: QuoteVersion[];
  approvals: Approval[];
  priceSnapshot?: { totalPrice: string; frozenAt: string } | null;
  proposalLink?: { token: string; openedAt?: string; acceptedAt?: string } | null;
}

export interface EnquiryRequestDetail extends EnquiryRequestSummary {
  notes?: string;
  interests: string[];
  budgetTier?: string;
  preferredStart?: string;
  preferredEnd?: string;
  tasks: TaskItem[];
  pipelineLog: PipelineEvent[];
  quotes: Quote[];
}

export interface TourTemplateSummary {
  id: string;
  title: string;
  summary?: string;
  durationDays: number;
}

export interface ItineraryDay {
  id: string;
  dayNumber: number;
  title: string;
  description?: string;
  mealsIncluded: string[];
  place?: { name: string } | null;
}

export interface TourTemplateDetail extends TourTemplateSummary {
  versions: { id: string; versionNumber: number; termsMarkdown?: string; days: ItineraryDay[] }[];
}

export interface Integration {
  id: string;
  provider: string;
  category: string;
  displayName: string;
  enabled: boolean;
  config: Record<string, string>;
  secretsConfigured: boolean;
  secretKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverview {
  requestsByStage: Record<string, number>;
  quotesByStatus: Record<string, number>;
  acceptedRevenue: { currency: string; total: number }[];
  teamMembersCount: number;
  integrationsEnabledCount: number;
  openTasksCount: number;
}

export interface OrgMember {
  id: string; // membership id
  role: string;
  permissions: string[];
  createdAt: string;
  user: { id: string; fullName: string; email: string; phone?: string; createdAt: string };
}
