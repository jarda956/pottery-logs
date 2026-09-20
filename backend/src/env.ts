import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  sessionSecret: required(
    "SESSION_SECRET",
    process.env.NODE_ENV === "production" ? undefined : "dev-only-insecure-secret"
  ),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 168),
  cookieSecure: (process.env.COOKIE_SECURE ?? "true") === "true",
  devCorsOrigin: process.env.DEV_CORS_ORIGIN ?? "http://localhost:5173",
  trustProxy: process.env.TRUST_PROXY === "1",
};
