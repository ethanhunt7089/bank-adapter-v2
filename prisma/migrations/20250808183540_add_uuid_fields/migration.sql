/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `api_logs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."api_logs" ADD COLUMN     "uuid" TEXT;

-- AlterTable
ALTER TABLE "public"."tokens" ADD COLUMN     "uuid" TEXT;

-- Update existing records with UUID
UPDATE "public"."api_logs" SET "uuid" = gen_random_uuid() WHERE "uuid" IS NULL;
UPDATE "public"."tokens" SET "uuid" = gen_random_uuid() WHERE "uuid" IS NULL;

-- Make columns NOT NULL
ALTER TABLE "public"."api_logs" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "public"."tokens" ALTER COLUMN "uuid" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "api_logs_uuid_key" ON "public"."api_logs"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_uuid_key" ON "public"."tokens"("uuid");
