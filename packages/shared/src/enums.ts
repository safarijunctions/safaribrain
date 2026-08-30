// Shared enums used by both the API and the web app.
// Keep these in sync with apps/api/prisma/schema.prisma — Prisma is the
// source of truth for persisted values; this file is what the frontend
// (which cannot import Prisma's generated client) imports instead.

export enum UserRole {
  CLIENT = "CLIENT",
  GUIDE = "GUIDE",
  OPERATOR = "OPERATOR",
  AGENT = "AGENT", // Trade/B2B — §3
  ADMIN = "ADMIN",
}

// Scoped permissions layered on top of role — §3 requires finance/safety
// actions to require dual control rather than a single "Admin" flag.
export enum Permission {
  APPROVE_QUOTE = "APPROVE_QUOTE",
  PUBLISH_FEE = "PUBLISH_FEE",
  ISSUE_REFUND = "ISSUE_REFUND",
  RUN_PAYOUT = "RUN_PAYOUT",
  CHANGE_BANK_DETAILS = "CHANGE_BANK_DETAILS",
  PUBLISH_SAFETY_CONTENT = "PUBLISH_SAFETY_CONTENT",
  MODERATE_LISTING = "MODERATE_LISTING",
  MANAGE_USERS = "MANAGE_USERS",
  // Adding/editing payment, messaging, or AI provider credentials — kept
  // separate from MANAGE_USERS/ADMIN role so credential access can be
  // granted narrowly, per §3's dual-control principle.
  MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS",
}

// Providers an admin can configure from the Admin Portal after launch,
// rather than the team hardcoding a choice up front — §11 "ask before
// choosing... payment providers" is resolved by making this admin-editable
// config instead of a build-time decision.
export enum IntegrationCategory {
  PAYMENT = "PAYMENT",
  MESSAGING = "MESSAGING",
  AI = "AI",
  OTHER = "OTHER",
}

export enum IntegrationProvider {
  STRIPE = "STRIPE",
  MPESA = "MPESA",
  TIGO_PESA = "TIGO_PESA",
  AIRTEL_MONEY = "AIRTEL_MONEY",
  MTN_MOMO = "MTN_MOMO",
  BANK_TRANSFER = "BANK_TRANSFER",
  WHATSAPP_BUSINESS = "WHATSAPP_BUSINESS",
  SMS = "SMS",
  EMAIL_SMTP = "EMAIL_SMTP",
  LLM_PROVIDER = "LLM_PROVIDER",
}

export const INTEGRATION_CATEGORY_BY_PROVIDER: Record<IntegrationProvider, IntegrationCategory> = {
  [IntegrationProvider.STRIPE]: IntegrationCategory.PAYMENT,
  [IntegrationProvider.MPESA]: IntegrationCategory.PAYMENT,
  [IntegrationProvider.TIGO_PESA]: IntegrationCategory.PAYMENT,
  [IntegrationProvider.AIRTEL_MONEY]: IntegrationCategory.PAYMENT,
  [IntegrationProvider.MTN_MOMO]: IntegrationCategory.PAYMENT,
  [IntegrationProvider.BANK_TRANSFER]: IntegrationCategory.PAYMENT,
  [IntegrationProvider.WHATSAPP_BUSINESS]: IntegrationCategory.MESSAGING,
  [IntegrationProvider.SMS]: IntegrationCategory.MESSAGING,
  [IntegrationProvider.EMAIL_SMTP]: IntegrationCategory.MESSAGING,
  [IntegrationProvider.LLM_PROVIDER]: IntegrationCategory.AI,
};

export enum RequestStage {
  NEW = "NEW",
  QUOTED = "QUOTED",
  NEGOTIATING = "NEGOTIATING",
  BOOKED = "BOOKED",
  COMPLETED = "COMPLETED",
  LOST = "LOST",
}

export enum QuoteStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  EXPIRED = "EXPIRED",
  DECLINED = "DECLINED",
}

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PAID = "PAID",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum FeeChangeStatus {
  DETECTED = "DETECTED",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum AiJobKind {
  ITINERARY_DRAFT = "ITINERARY_DRAFT",
  PROPOSAL_REWRITE = "PROPOSAL_REWRITE",
  TRANSLATION = "TRANSLATION",
  FEE_EXTRACTION = "FEE_EXTRACTION",
  NEWS_SUMMARY = "NEWS_SUMMARY",
  REPLY_DRAFT = "REPLY_DRAFT",
}

// Every AI job must be approved by a human before it can affect price,
// published content, a confirmed booking, or safety-critical information — §1.3, §9.
export enum AiJobApprovalStatus {
  DRAFTED = "DRAFTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum LeadSourceChannel {
  WEB = "WEB",
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
  PHONE = "PHONE",
  REFERRAL = "REFERRAL",
  WALK_IN = "WALK_IN",
}
