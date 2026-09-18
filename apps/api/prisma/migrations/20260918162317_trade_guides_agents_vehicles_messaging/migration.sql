-- CreateEnum
CREATE TYPE "OrganizationKind" AS ENUM ('OPERATOR', 'GUIDE', 'AGENT');

-- CreateEnum
CREATE TYPE "BookingChannel" AS ENUM ('RETAIL', 'TRADE');

-- CreateEnum
CREATE TYPE "RentalListingVisibility" AS ENUM ('LISTED', 'UNLISTED');

-- CreateEnum
CREATE TYPE "RentalAgreementStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "agentOrganizationId" TEXT,
ADD COLUMN     "channel" "BookingChannel" NOT NULL DEFAULT 'RETAIL',
ADD COLUMN     "retailTotalPrice" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "departures" ADD COLUMN     "netPricePerSeat" DECIMAL(12,2),
ADD COLUMN     "tradeVisible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "kind" "OrganizationKind" NOT NULL DEFAULT 'OPERATOR';

-- CreateTable
CREATE TABLE "vehicle_rental_listings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "dailyRate" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "visibility" "RentalListingVisibility" NOT NULL DEFAULT 'LISTED',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_rental_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_rental_agreements" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "ownerOrganizationId" TEXT NOT NULL,
    "renterOrganizationId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dailyRate" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "message" TEXT,
    "status" "RentalAgreementStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_rental_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "organizationAId" TEXT NOT NULL,
    "organizationBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderOrganizationId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_rental_listings_vehicleId_key" ON "vehicle_rental_listings"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_organizationAId_organizationBId_key" ON "conversations"("organizationAId", "organizationBId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agentOrganizationId_fkey" FOREIGN KEY ("agentOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_rental_listings" ADD CONSTRAINT "vehicle_rental_listings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_rental_listings" ADD CONSTRAINT "vehicle_rental_listings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_rental_agreements" ADD CONSTRAINT "vehicle_rental_agreements_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "vehicle_rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_rental_agreements" ADD CONSTRAINT "vehicle_rental_agreements_ownerOrganizationId_fkey" FOREIGN KEY ("ownerOrganizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_rental_agreements" ADD CONSTRAINT "vehicle_rental_agreements_renterOrganizationId_fkey" FOREIGN KEY ("renterOrganizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organizationAId_fkey" FOREIGN KEY ("organizationAId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organizationBId_fkey" FOREIGN KEY ("organizationBId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderOrganizationId_fkey" FOREIGN KEY ("senderOrganizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
