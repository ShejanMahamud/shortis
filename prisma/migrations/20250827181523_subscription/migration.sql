/*
  Warnings:

  - Made the column `currentPeriodStart` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currentPeriodEnd` on table `subscriptions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."subscriptions" ALTER COLUMN "currentPeriodStart" SET NOT NULL,
ALTER COLUMN "currentPeriodEnd" SET NOT NULL;
