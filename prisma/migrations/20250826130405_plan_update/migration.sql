/*
  Warnings:

  - Made the column `description` on table `plans` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."plans" ALTER COLUMN "description" SET NOT NULL;
