/**
 * Bootstraps the very first administrator account from INITIAL_ADMIN_EMAIL /
 * INITIAL_ADMIN_PASSWORD in .env. Safe to re-run: it does nothing if an
 * admin with that email already exists.
 *
 * Usage: npm run seed:admin
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashSecret, validatePasswordStrength } from "../lib/password";
import { ensureSqliteDirExists } from "../lib/ensureDataDir";

async function main() {
  ensureSqliteDirExists(process.env.DATABASE_URL);

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in .env first.");
    process.exit(1);
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    console.error(`INITIAL_ADMIN_PASSWORD is not strong enough (${passwordError}).`);
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists (role=${existing.role}); leaving it as is.`);
    return;
  }

  const passwordHash = await hashSecret(password);
  const admin = await prisma.user.create({
    data: { email, passwordHash, role: "ADMIN" },
  });

  console.log(`Created admin account ${admin.email}.`);
  console.log("Sign in and set up two-factor authentication immediately — it is required for admins.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
