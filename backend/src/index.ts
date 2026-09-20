import { createApp } from "./app";
import { env } from "./env";
import { ensureSqliteDirExists } from "./lib/ensureDataDir";

// Last-resort safety net: every route/middleware is wrapped so this should
// never fire, but a crashed process takes down every logged-in user, so log
// loudly instead of dying silently if something still slips through.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

ensureSqliteDirExists(process.env.DATABASE_URL);

const app = createApp();

app.listen(env.port, () => {
  console.log(`Pottery Logs API listening on port ${env.port} (${env.nodeEnv})`);
});
