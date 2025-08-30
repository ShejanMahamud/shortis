-- CreateEnum
CREATE TYPE "public"."PlanType" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."PlanInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('BDT');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('BKASH');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "password" TEXT,
    "refreshToken" TEXT,
    "refreshTokenExp" TIMESTAMP(3),
    "profilePicture" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."urls" (
    "id" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "qrCode" TEXT,
    "description" TEXT,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "customDomain" TEXT,
    "clickLimit" INTEGER,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clicks" (
    "id" TEXT NOT NULL,
    "urlId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "country" TEXT,
    "city" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics" (
    "id" TEXT NOT NULL,
    "urlId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."PlanType" NOT NULL DEFAULT 'FREE',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "public"."Currency" NOT NULL DEFAULT 'BDT',
    "interval" "public"."PlanInterval" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'BKASH',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "bkashPaymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'BDT',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'BKASH',
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_refreshToken_key" ON "public"."users"("refreshToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "public"."users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "urls_slug_key" ON "public"."urls"("slug");

-- CreateIndex
CREATE INDEX "urls_slug_idx" ON "public"."urls"("slug");

-- CreateIndex
CREATE INDEX "urls_userId_idx" ON "public"."urls"("userId");

-- CreateIndex
CREATE INDEX "urls_isActive_idx" ON "public"."urls"("isActive");

-- CreateIndex
CREATE INDEX "urls_expiresAt_idx" ON "public"."urls"("expiresAt");

-- CreateIndex
CREATE INDEX "urls_createdAt_idx" ON "public"."urls"("createdAt");

-- CreateIndex
CREATE INDEX "clicks_urlId_idx" ON "public"."clicks"("urlId");

-- CreateIndex
CREATE INDEX "clicks_userId_idx" ON "public"."clicks"("userId");

-- CreateIndex
CREATE INDEX "clicks_clickedAt_idx" ON "public"."clicks"("clickedAt");

-- CreateIndex
CREATE INDEX "clicks_country_idx" ON "public"."clicks"("country");

-- CreateIndex
CREATE INDEX "analytics_urlId_idx" ON "public"."analytics"("urlId");

-- CreateIndex
CREATE INDEX "analytics_date_idx" ON "public"."analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_urlId_date_key" ON "public"."analytics"("urlId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "public"."plans"("name");

-- CreateIndex
CREATE INDEX "plans_isActive_idx" ON "public"."plans"("isActive");

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

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "public"."subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "public"."subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "public"."subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "payment_history_bkashPaymentId_key" ON "public"."payment_history"("bkashPaymentId");

-- CreateIndex
CREATE INDEX "payment_history_userId_idx" ON "public"."payment_history"("userId");

-- CreateIndex
CREATE INDEX "payment_history_subscriptionId_idx" ON "public"."payment_history"("subscriptionId");

-- CreateIndex
CREATE INDEX "payment_history_status_idx" ON "public"."payment_history"("status");

-- CreateIndex
CREATE INDEX "payment_history_bkashPaymentId_idx" ON "public"."payment_history"("bkashPaymentId");

-- CreateIndex
CREATE INDEX "payment_history_paidAt_idx" ON "public"."payment_history"("paidAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "public"."notifications"("userId");

-- AddForeignKey
ALTER TABLE "public"."urls" ADD CONSTRAINT "urls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clicks" ADD CONSTRAINT "clicks_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "public"."urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clicks" ADD CONSTRAINT "clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analytics" ADD CONSTRAINT "analytics_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "public"."urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_history" ADD CONSTRAINT "payment_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_history" ADD CONSTRAINT "payment_history_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
