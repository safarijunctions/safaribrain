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
  owner?: { id: string; fullName: string } | null;
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
  commissionPercent: number;
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
  publiclyListed?: boolean;
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

export interface DepartureSeatSummary {
  status: "AVAILABLE" | "HELD" | "BOOKED";
  heldUntil?: string | null;
}

export interface Departure {
  id: string;
  departureDate: string;
  currency: string;
  pricePerSeat: string;
  totalSeats: number;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  seats: DepartureSeatSummary[];
}

export interface PublicDeparture {
  id: string;
  departureDate: string;
  currency: string;
  pricePerSeat: string;
  totalSeats: number;
  tourTemplate: { title: string; organization: { name: string; country: string } };
}

export interface SeatMapSeat {
  id: string;
  label: string;
  type: "WINDOW" | "AISLE" | "FRONT" | "ACCESSIBLE";
  status: "AVAILABLE" | "HELD" | "BOOKED";
  isMine: boolean;
}

export interface AiDraftDay {
  dayNumber: number;
  title: string;
  description?: string;
  mealsIncluded: string[];
}

export interface AiItineraryDraft {
  id: string;
  status: "DRAFTED" | "APPROVED" | "REJECTED";
  prompt: string;
  model: string;
  output: { title: string; summary: string; days: AiDraftDay[] };
  createdAt: string;
  requestedBy?: { id: string; fullName: string } | null;
}

export interface ReplyDraftJob {
  id: string;
  status: "DRAFTED" | "APPROVED" | "REJECTED";
  output: { replyText: string };
  createdAt: string;
  requestedBy?: { id: string; fullName: string } | null;
}

export interface MarketplaceListingSummary {
  id: string;
  title: string;
  summary?: string | null;
  durationDays: number;
  organization: { name: string; country: string };
}

export interface MarketplaceListingDetail extends MarketplaceListingSummary {
  versions: { id: string; versionNumber: number; termsMarkdown?: string | null; days: ItineraryDay[] }[];
}

export interface FeeRule {
  id: string;
  label: string;
  residency: string;
  ageBand?: string | null;
  unit: string;
  amount: string;
  currency: string;
  sourceUrl?: string | null;
  sourceAsOf: string;
}

export interface Place {
  id: string;
  name: string;
  country: string;
  kind: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  feeRules: FeeRule[];
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

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; fullName: string; email: string } | null;
}

export interface AuditLogPage {
  rows: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Traveler {
  id: string;
  fullName: string;
  dateOfBirth?: string;
  passportNumber?: string;
}

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  method: string;
  reference?: string | null;
  createdAt: string;
  recordedBy?: { id: string; fullName: string } | null;
}

export interface BookingItineraryDay {
  dayNumber: number;
  title: string;
  description?: string | null;
  mealsIncluded: string[];
  place?: { name: string } | null;
}

export interface BookingItinerary {
  title?: string | null;
  durationDays?: number | null;
  days: BookingItineraryDay[];
}

export interface Vehicle {
  id: string;
  name: string;
  registrationNumber: string;
  capacity: number;
  status: "ACTIVE" | "MAINTENANCE" | "RETIRED";
  insuranceExpiry?: string | null;
  inspectionExpiry?: string | null;
  notes?: string | null;
  complianceStatus: "OK" | "EXPIRING_SOON" | "EXPIRED" | "NOT_TRACKED";
}

export interface SupplierConfirmation {
  id: string;
  supplierName: string;
  supplierType?: string | null;
  status: "PENDING" | "CONFIRMED" | "DECLINED";
  referenceCode?: string | null;
  neededBy?: string | null;
  confirmedAt?: string | null;
  notes?: string | null;
}

export interface Booking {
  id: string;
  status: string;
  currency: string;
  totalPrice: string;
  amountPaid: string;
  ticketToken: string;
  guideName?: string | null;
  guidePhone?: string | null;
  pickupNotes?: string | null;
  vehicleId?: string | null;
  vehicle?: Vehicle | null;
  travelers: Traveler[];
  payments: Payment[];
  termsSnapshot?: { itinerary: BookingItinerary; termsMarkdown?: string | null; frozenAt: string } | null;
  review?: { status: string; rating: number } | null;
  supplierConfirmations: SupplierConfirmation[];
}

export interface PublicBookingReview {
  status: "PENDING" | "PUBLISHED" | "REJECTED";
  rating: number;
  title?: string | null;
  body?: string | null;
  operatorReply?: string | null;
}

export interface PublicBooking {
  status: string;
  currency: string;
  totalPrice: string;
  amountPaid: string;
  balanceDue: number;
  contactName: string;
  travelers: { fullName: string }[];
  payments: { amount: string; method: string; createdAt: string }[];
  itinerary: BookingItinerary | null;
  termsMarkdown?: string | null;
  review: PublicBookingReview | null;
}

export interface PublishedReview {
  id: string;
  reviewerName: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  operatorReply?: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  average: number | null;
  count: number;
  reviews: PublishedReview[];
}

export interface ModerationReview {
  id: string;
  reviewerName: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: string;
  createdAt: string;
  booking: { ticketToken: string };
  tourTemplate?: { title: string } | null;
}
