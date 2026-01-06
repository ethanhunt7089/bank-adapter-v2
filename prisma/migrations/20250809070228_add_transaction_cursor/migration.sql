-- CreateTable
CREATE TABLE "public"."transaction_cursors" (
    "id" SERIAL NOT NULL,
    "token_uuid" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_cursors_token_uuid_key" ON "public"."transaction_cursors"("token_uuid");

-- AddForeignKey
ALTER TABLE "public"."transaction_cursors" ADD CONSTRAINT "transaction_cursors_token_uuid_fkey" FOREIGN KEY ("token_uuid") REFERENCES "public"."tokens"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
