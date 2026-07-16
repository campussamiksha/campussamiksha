/**
 * Retention sweep — deletes verification proof files for still-pending requests
 * past their expiry (default 30 days) and marks them 'expired'. Approved/rejected
 * files are purged at decision time; this covers proofs never acted on.
 *
 * Schedule daily, e.g. (cron):
 *   0 3 * * *  cd /app && npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/purge-verification.ts
 */
import { prisma } from "../lib/prisma";
import { purgeExpired } from "../lib/verification";

async function main() {
  const n = await purgeExpired();
  console.log(`Purged ${n} expired verification document(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
