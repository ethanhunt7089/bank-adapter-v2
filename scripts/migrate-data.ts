import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Migrating data from bo_token to bo_webhooks...')
  try {
    const result = await prisma.$executeRawUnsafe(`
      INSERT INTO bo_webhooks (bo_token_id, target_domain, true_secret, target_acc_num, cas_api_base, updated_at)
      SELECT id, target_domain, true_secret, target_acc_num, cas_api_base, now()
      FROM bo_token
      WHERE target_domain IS NOT NULL
      ON CONFLICT (target_domain) DO NOTHING
    `);
    
    console.log('✅ Migrated ' + result + ' records to bo_webhooks');
  } catch (error) {
    console.error('❌ Error migrating data:', error);
  } finally {
    await prisma.$disconnect()
  }
}

main()
