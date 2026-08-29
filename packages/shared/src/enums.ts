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
}

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
