import crypto from "crypto";
import type { Request, Response } from "express";
import { prisma } from "./prisma";
import { env } from "../env";

export const SESSION_COOKIE = "plg_sid";
export const CSRF_COOKIE = "plg_csrf";
export const PENDING_2FA_COOKIE = "plg_pending2fa";

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };
}

function sessionTtlMs(): number {
  return env.sessionTtlHours * 60 * 60 * 1000;
}

export async function createSession(
  req: Request,
  res: Response,
  userId: string
): Promise<void> {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionTtlMs());

  await prisma.session.create({
    data: {
      id,
      userId,
      expiresAt,
      userAgent: req.headers["user-agent"]?.slice(0, 255),
      ipAddress: req.ip,
    },
  });

  res.cookie(SESSION_COOKIE, id, { ...baseCookieOptions(), expires: expiresAt });

  // Double-submit CSRF token: readable by JS, verified against a header on
  // every state-changing request. Rotated on every login.
  const csrfToken = crypto.randomBytes(24).toString("hex");
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const id = req.cookies?.[SESSION_COOKIE];
  if (id) {
    await prisma.session.deleteMany({ where: { id } });
  }
  res.clearCookie(SESSION_COOKIE, baseCookieOptions());
  res.clearCookie(CSRF_COOKIE, { ...baseCookieOptions(), httpOnly: false });
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function loadSessionUser(req: Request) {
  const id = req.cookies?.[SESSION_COOKIE];
  if (!id) return null;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive) return null;

  return session.user;
}

// --- Short-lived signed token used between "password OK" and "TOTP code
// verified" for accounts with 2FA enabled. Stateless (HMAC-signed), so it
// needs no DB row / cleanup job.

interface PendingPayload {
  userId: string;
  exp: number;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", env.sessionSecret).update(data).digest("base64url");
}

export function issuePending2faToken(res: Response, userId: string): void {
  const payload: PendingPayload = { userId, exp: Date.now() + 5 * 60 * 1000 };
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${json}.${sign(json)}`;
  res.cookie(PENDING_2FA_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: 5 * 60 * 1000,
  });
}

export function readPending2faToken(req: Request): string | null {
  const token = req.cookies?.[PENDING_2FA_COOKIE];
  if (!token || typeof token !== "string") return null;

  const [json, signature] = token.split(".");
  if (!json || !signature) return null;
  if (sign(json) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as PendingPayload;
    if (payload.exp < Date.now()) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export function clearPending2faToken(res: Response): void {
  res.clearCookie(PENDING_2FA_COOKIE, baseCookieOptions());
}
