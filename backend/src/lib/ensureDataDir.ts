import fs from "fs";
import path from "path";

/**
 * SQLite will not create a missing parent directory for its database file,
 * and relative `file:` DATABASE_URL values are resolved differently by the
 * Prisma CLI (relative to prisma/schema.prisma) than by the runtime client
 * (relative to process.cwd()). To sidestep that mismatch entirely, callers
 * should set DATABASE_URL to an absolute path in production; this just makes
 * sure the parent directory exists before Prisma tries to open the file,
 * covering both relative (dev) and absolute (prod) configurations.
 */
export function ensureSqliteDirExists(databaseUrl: string | undefined): void {
  if (!databaseUrl?.startsWith("file:")) return;

  const filePath = databaseUrl.slice("file:".length);
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
}
