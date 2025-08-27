/*
  Warnings:

  - You are about to drop the column `bkashTrxId` on the `payment_history` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."payment_history_bkashTrxId_key";

-- AlterTable
ALTER TABLE "public"."payment_history" DROP COLUMN "bkashTrxId";
