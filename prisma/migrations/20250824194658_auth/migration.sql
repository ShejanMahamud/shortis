/*
  Warnings:

  - You are about to drop the column `accessToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `accessTokenExp` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."users_accessToken_key";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "accessToken",
DROP COLUMN "accessTokenExp";
