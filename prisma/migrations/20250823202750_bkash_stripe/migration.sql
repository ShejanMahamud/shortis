/*
  Warnings:

  - The `currency` column on the `payment_history` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentMethod` column on the `payment_history` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `trialEnd` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `trialStart` on the `subscriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bkashPaymentId]` on the table `payment_history` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('USD', 'BDT');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('STRIPE', 'BKASH');

-- AlterTable
ALTER TABLE "public"."payment_history" ADD COLUMN     "bkashPaymentId" TEXT,
DROP COLUMN "currency",
ADD COLUMN     "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'STRIPE';

-- AlterTable
ALTER TABLE "public"."plans" DROP COLUMN "currency",
ADD COLUMN     "currency" "public"."Currency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."subscriptions" DROP COLUMN "trialEnd",
DROP COLUMN "trialStart",
ADD COLUMN     "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'STRIPE';

-- AlterTable
ALTER TABLE "public"."webhook_events" ADD COLUMN     "provider" "public"."PaymentMethod" NOT NULL DEFAULT 'STRIPE';

-- CreateIndex
CREATE UNIQUE INDEX "payment_history_bkashPaymentId_key" ON "public"."payment_history"("bkashPaymentId");
