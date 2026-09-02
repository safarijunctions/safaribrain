-- CreateEnum
CREATE TYPE "DepartureStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SeatType" AS ENUM ('WINDOW', 'AISLE', 'FRONT', 'ACCESSIBLE');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'HELD', 'BOOKED');

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_quoteId_fkey";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "departureId" TEXT,
ALTER COLUMN "quoteId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "departures" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tourTemplateId" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "pricePerSeat" DECIMAL(12,2) NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "status" "DepartureStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "SeatType" NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "heldUntil" TIMESTAMP(3),
    "holderToken" TEXT,
    "bookingId" TEXT,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seats_departureId_label_key" ON "seats"("departureId", "label");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "departures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departures" ADD CONSTRAINT "departures_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departures" ADD CONSTRAINT "departures_tourTemplateId_fkey" FOREIGN KEY ("tourTemplateId") REFERENCES "tour_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "departures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
