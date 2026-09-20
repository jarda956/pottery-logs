import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../env";
import { CSRF_COOKIE } from "./sessions";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Makes sure every client has a CSRF cookie to echo back, even before
// logging in (protects the login/register endpoints too).
export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(24).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: env.cookieSecure,
      sameSite: "lax",
      path: "/",
    });
    req.cookies = { ...req.cookies, [CSRF_COOKIE]: token };
  }
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: "csrf_validation_failed" });
    return;
  }

  next();
}
