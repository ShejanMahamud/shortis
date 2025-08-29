/*
  Warnings:

  - A unique constraint covering the columns `[bkashTrxId]` on the table `payment_history` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."payment_history" ADD COLUMN     "bkashTrxId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_history_bkashTrxId_key" ON "public"."payment_history"("bkashTrxId");
