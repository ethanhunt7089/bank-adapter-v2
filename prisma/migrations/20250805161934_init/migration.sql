-- CreateTable
CREATE TABLE "public"."tokens" (
    "id" SERIAL NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "description" TEXT,
    "target_domain" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "token_hash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_logs" (
    "id" SERIAL NOT NULL,
    "client_id" TEXT NOT NULL,
    "target_domain" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "request_data" JSONB,
    "response_data" JSONB,
    "status_code" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_client_id_key" ON "public"."tokens"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_hash_key" ON "public"."tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "public"."api_logs" ADD CONSTRAINT "api_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."tokens"("client_id") ON DELETE RESTRICT ON UPDATE CASCADE;
