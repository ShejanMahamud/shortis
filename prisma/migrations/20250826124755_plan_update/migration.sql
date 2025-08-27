/*
  Warnings:

  - You are about to drop the column `features` on the `plans` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."plans" DROP COLUMN "features";

-- CreateTable
CREATE TABLE "public"."PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanFeature_planId_idx" ON "public"."PlanFeature"("planId");

-- CreateIndex
CREATE INDEX "PlanFeature_key_idx" ON "public"."PlanFeature"("key");

-- AddForeignKey
ALTER TABLE "public"."PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
