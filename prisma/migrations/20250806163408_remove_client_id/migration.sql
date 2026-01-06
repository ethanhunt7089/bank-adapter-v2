/*
  Warnings:

  - You are about to drop the column `client_id` on the `api_logs` table. All the data in the column will be lost.
  - You are about to drop the column `client_id` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `client_secret` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `prefix` on the `tokens` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[target_domain]` on the table `tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."api_logs" DROP CONSTRAINT "api_logs_client_id_fkey";

-- DropIndex
DROP INDEX "public"."tokens_client_id_key";

-- AlterTable
ALTER TABLE "public"."api_logs" DROP COLUMN "client_id";

-- AlterTable
ALTER TABLE "public"."tokens" DROP COLUMN "client_id",
DROP COLUMN "client_secret",
DROP COLUMN "description",
DROP COLUMN "prefix";

-- CreateIndex
CREATE UNIQUE INDEX "tokens_target_domain_key" ON "public"."tokens"("target_domain");

-- AddForeignKey
ALTER TABLE "public"."api_logs" ADD CONSTRAINT "api_logs_target_domain_fkey" FOREIGN KEY ("target_domain") REFERENCES "public"."tokens"("target_domain") ON DELETE RESTRICT ON UPDATE CASCADE;
