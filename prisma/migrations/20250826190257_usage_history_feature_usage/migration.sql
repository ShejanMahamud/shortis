/*
  Warnings:

  - You are about to drop the `PlanFeature` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PlanFeature" DROP CONSTRAINT "PlanFeature_planId_fkey";

-- DropTable
DROP TABLE "public"."PlanFeature";

-- CreateTable
CREATE TABLE "public"."plan_features" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_features_planId_idx" ON "public"."plan_features"("planId");

-- CreateIndex
CREATE INDEX "plan_features_key_idx" ON "public"."plan_features"("key");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_planId_key_key" ON "public"."plan_features"("planId", "key");

-- CreateIndex
CREATE INDEX "usage_history_userId_idx" ON "public"."usage_history"("userId");

-- CreateIndex
CREATE INDEX "usage_history_planId_idx" ON "public"."usage_history"("planId");

-- CreateIndex
CREATE INDEX "feature_usage_userId_idx" ON "public"."feature_usage"("userId");

-- CreateIndex
CREATE INDEX "feature_usage_subscriptionId_idx" ON "public"."feature_usage"("subscriptionId");

-- CreateIndex
CREATE INDEX "feature_usage_featureKey_idx" ON "public"."feature_usage"("featureKey");

-- CreateIndex
CREATE INDEX "feature_usage_periodEnd_idx" ON "public"."feature_usage"("periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "feature_usage_userId_subscriptionId_featureKey_periodStart__key" ON "public"."feature_usage"("userId", "subscriptionId", "featureKey", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "public"."plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_history" ADD CONSTRAINT "usage_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_history" ADD CONSTRAINT "usage_history_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_usage" ADD CONSTRAINT "feature_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_usage" ADD CONSTRAINT "feature_usage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
