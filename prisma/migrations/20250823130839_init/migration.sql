-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."PlanInterval" AS ENUM ('MONTH', 'YEAR', 'WEEK', 'DAY');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'TRIALING', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "password" TEXT,
    "accessToken" TEXT,
    "accessTokenExp" TIMESTAMP(3),
    "refreshToken" TEXT,
    "refreshTokenExp" TIMESTAMP(3),
    "profilePicture" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
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
    "description" TEXT,
    "stripePriceId" TEXT,
    "stripeProductId" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "interval" "public"."PlanInterval" NOT NULL,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "stripePaymentId" TEXT,
    "stripeInvoiceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "paymentMethod" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhook_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_accessToken_key" ON "public"."users"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_refreshToken_key" ON "public"."users"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "public"."users"("isActive");

-- CreateIndex
CREATE INDEX "users_stripeCustomerId_idx" ON "public"."users"("stripeCustomerId");

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
CREATE UNIQUE INDEX "plans_stripePriceId_key" ON "public"."plans"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripeProductId_key" ON "public"."plans"("stripeProductId");

-- CreateIndex
CREATE INDEX "plans_isActive_idx" ON "public"."plans"("isActive");

-- CreateIndex
CREATE INDEX "plans_stripePriceId_idx" ON "public"."plans"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "public"."subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "public"."subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "public"."subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "public"."subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "public"."subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "payment_history_stripePaymentId_key" ON "public"."payment_history"("stripePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_history_stripeInvoiceId_key" ON "public"."payment_history"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "payment_history_userId_idx" ON "public"."payment_history"("userId");

-- CreateIndex
CREATE INDEX "payment_history_subscriptionId_idx" ON "public"."payment_history"("subscriptionId");

-- CreateIndex
CREATE INDEX "payment_history_status_idx" ON "public"."payment_history"("status");

-- CreateIndex
CREATE INDEX "payment_history_stripePaymentId_idx" ON "public"."payment_history"("stripePaymentId");

-- CreateIndex
CREATE INDEX "payment_history_paidAt_idx" ON "public"."payment_history"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_stripeEventId_key" ON "public"."webhook_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "webhook_events_stripeEventId_idx" ON "public"."webhook_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "webhook_events_processed_idx" ON "public"."webhook_events"("processed");

-- CreateIndex
CREATE INDEX "webhook_events_eventType_idx" ON "public"."webhook_events"("eventType");

-- CreateIndex
CREATE INDEX "webhook_events_createdAt_idx" ON "public"."webhook_events"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."urls" ADD CONSTRAINT "urls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clicks" ADD CONSTRAINT "clicks_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "public"."urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clicks" ADD CONSTRAINT "clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analytics" ADD CONSTRAINT "analytics_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "public"."urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_history" ADD CONSTRAINT "payment_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_history" ADD CONSTRAINT "payment_history_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
