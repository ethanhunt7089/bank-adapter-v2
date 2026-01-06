import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Adding bo_webhooks table...')
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bo_webhooks" (
        "id" SERIAL NOT NULL,
        "bo_token_id" INTEGER NOT NULL,
        "target_domain" VARCHAR(500) NOT NULL,
        "true_secret" VARCHAR(255),
        "target_acc_num" VARCHAR(15),
        "cas_api_base" VARCHAR(500),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "bo_webhooks_pkey" PRIMARY KEY ("id")
      )
    `);
    
    // Create index if not exists (using a trick for Postgres < 15 or just TRY-CATCH)
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "bo_webhooks_target_domain_key" ON "bo_webhooks"("target_domain")`);
    } catch (e) {
      console.log('Index might already exist or error: ' + e.message);
    }
    
    // Add foreign key if not exists
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "bo_webhooks" 
        ADD CONSTRAINT "bo_webhooks_bo_token_id_fkey" 
        FOREIGN KEY ("bo_token_id") REFERENCES "bo_token"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE
      `);
    } catch (e) {
      console.log('Foreign key might already exist or error: ' + e.message);
    }
    
    console.log('✅ bo_webhooks table checked/created successfully');
  } catch (error) {
    console.error('❌ Error creating table:', error);
  } finally {
    await prisma.$disconnect()
  }
}

main()
