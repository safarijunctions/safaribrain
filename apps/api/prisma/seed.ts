import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { Permission, UserRole } from "@safaribrain/shared";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: {
      name: "Safari Junction's Adventures",
      country: "TZ",
      currency: "USD", // most Tanzanian tour operators quote international clients in USD
      verified: true,
    },
  });

  const passwordHash = await bcrypt.hash("safaribrain-demo", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@safarijunctionsadventures.co.tz",
      passwordHash,
      fullName: "Amina Mrema (Admin)",
      memberships: {
        create: {
          organizationId: org.id,
          role: UserRole.ADMIN,
          permissions: Object.values(Permission),
        },
      },
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: "operator@safarijunctionsadventures.co.tz",
      passwordHash,
      fullName: "Juma Kimaro (Operator)",
      memberships: {
        create: { organizationId: org.id, role: UserRole.OPERATOR, permissions: [] },
      },
    },
  });

  // Dual-control per §3: the operator who drafts a quote is not the one
  // who can approve it. A separate sales-manager membership holds that grant.
  const manager = await prisma.user.create({
    data: {
      email: "manager@safarijunctionsadventures.co.tz",
      passwordHash,
      fullName: "Grace Mushi (Sales Manager)",
      memberships: {
        create: { organizationId: org.id, role: UserRole.OPERATOR, permissions: [Permission.APPROVE_QUOTE] },
      },
    },
  });

  const serengeti = await prisma.place.create({
    data: {
      organizationId: org.id,
      name: "Serengeti National Park",
      country: "TZ",
      kind: "NATIONAL_PARK",
      description: "Endless plains famous for the Great Migration.",
      latitude: -2.3333,
      longitude: 34.8333,
      feeRules: {
        create: [
          {
            label: "Non-resident adult, 24hr entry",
            residency: "NON_RESIDENT",
            ageBand: "ADULT",
            unit: "PER_PERSON_PER_DAY",
            amount: 70,
            currency: "USD",
            sourceUrl: "https://www.tanzaniaparks.go.tz/",
            sourceAsOf: new Date("2026-07-01"),
          },
        ],
      },
    },
  });

  const ngorongoro = await prisma.place.create({
    data: {
      organizationId: org.id,
      name: "Ngorongoro Conservation Area",
      country: "TZ",
      kind: "CONSERVATION_AREA",
      description: "A UNESCO World Heritage crater teeming with wildlife.",
      latitude: -3.2,
      longitude: 35.5,
      feeRules: {
        create: [
          {
            label: "Non-resident adult, 24hr entry",
            residency: "NON_RESIDENT",
            ageBand: "ADULT",
            unit: "PER_PERSON_PER_DAY",
            amount: 82,
            currency: "USD",
            sourceUrl: "https://www.ncaa.go.tz/",
            sourceAsOf: new Date("2026-07-01"),
          },
        ],
      },
    },
  });

  const tarangire = await prisma.place.create({
    data: {
      organizationId: org.id,
      name: "Tarangire National Park",
      country: "TZ",
      kind: "NATIONAL_PARK",
      description: "Baobab-studded park with huge elephant herds.",
      latitude: -3.8333,
      longitude: 35.9167,
      feeRules: {
        create: [
          {
            label: "Non-resident adult, 24hr entry",
            residency: "NON_RESIDENT",
            ageBand: "ADULT",
            unit: "PER_PERSON_PER_DAY",
            amount: 53,
            currency: "USD",
            sourceUrl: "https://www.tanzaniaparks.go.tz/",
            sourceAsOf: new Date("2026-07-01"),
          },
        ],
      },
    },
  });

  const template = await prisma.tourTemplate.create({
    data: {
      organizationId: org.id,
      title: "Classic Northern Circuit — 4 Days",
      summary: "Tarangire, Ngorongoro Crater and Serengeti in one unforgettable loop.",
      durationDays: 4,
      versions: {
        create: [
          {
            versionNumber: 1,
            termsMarkdown:
              "Full refund up to 60 days before departure; 50% refund 30-59 days before; no refund inside 30 days. Prices exclude international flights and visas.",
            days: {
              create: [
                { dayNumber: 1, placeId: tarangire.id, title: "Arrive & Tarangire game drive", mealsIncluded: ["LUNCH", "DINNER"] },
                { dayNumber: 2, placeId: ngorongoro.id, title: "Ngorongoro Crater floor safari", mealsIncluded: ["BREAKFAST", "LUNCH", "DINNER"] },
                { dayNumber: 3, placeId: serengeti.id, title: "Serengeti — Great Migration search", mealsIncluded: ["BREAKFAST", "LUNCH", "DINNER"] },
                { dayNumber: 4, placeId: serengeti.id, title: "Morning game drive & departure", mealsIncluded: ["BREAKFAST"] },
              ],
            },
          },
        ],
      },
    },
  });

  const contact = await prisma.contact.create({
    data: {
      organizationId: org.id,
      fullName: "Laura Bennett",
      email: "laura.bennett@example.com",
      whatsapp: "+15551234567",
      country: "US",
    },
  });

  const request = await prisma.enquiryRequest.create({
    data: {
      organizationId: org.id,
      contactId: contact.id,
      ownerId: operator.id,
      source: "WHATSAPP",
      partySize: 2,
      budgetTier: "MID",
      preferredStart: new Date("2026-10-10"),
      preferredEnd: new Date("2026-10-14"),
      interests: ["wildlife", "photography"],
      notes: "Honeymoon trip, would love a sundowner at the crater rim.",
      consentGiven: true,
      pipelineLog: { create: [{ stage: "NEW", note: "Enquiry received via WhatsApp" }] },
      tasks: { create: [{ title: "First response to enquiry", assigneeId: operator.id, dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }] },
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log({
    orgId: org.id,
    adminLogin: { email: admin.email, password: "safaribrain-demo" },
    operatorLogin: { email: operator.email, password: "safaribrain-demo" },
    managerLogin: { email: manager.email, password: "safaribrain-demo" },
    templateId: template.id,
    requestId: request.id,
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
