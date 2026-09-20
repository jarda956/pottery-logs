import { Router } from "express";
import { prisma } from "../lib/prisma";
import { hashSecret, validatePasswordStrength, verifySecret } from "../lib/password";
import {
  clearPending2faToken,
  createSession,
  destroySession,
  issuePending2faToken,
} from "../lib/sessions";
import { loginRateLimiter, registerRateLimiter } from "../middleware/rateLimiters";
import { loginSchema, registerSchema } from "../validation/schemas";
import { logAudit } from "../lib/audit";
import { asyncHandler } from "../lib/asyncHandler";

export const authRouter = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

authRouter.post("/register", registerRateLimiter, asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const { email, password, language } = parsed.data;

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Do not leak whether the account exists.
    res.status(201).json({ ok: true });
    return;
  }

  const passwordHash = await hashSecret(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "USER",
      language: language ?? "cs",
    },
  });

  await logAudit(user.id, "user.register", user.id);

  res.status(201).json({ ok: true });
}));

authRouter.post("/login", loginRateLimiter, asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-shape response whether or not the account exists, to avoid
  // user enumeration.
  const genericFailure = () => res.status(401).json({ error: "invalid_credentials" });

  if (!user) {
    genericFailure();
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "account_disabled" });
    return;
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    res.status(423).json({ error: "account_locked" });
    return;
  }

  const validPassword = await verifySecret(user.passwordHash, password);
  if (!validPassword) {
    const failedCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: failedCount, lockedUntil },
    });
    genericFailure();
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  if (user.totpEnabled) {
    issuePending2faToken(res, user.id);
    res.json({ requiresTwoFactor: true });
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(req, res, user.id);
  await logAudit(user.id, "user.login", user.id);
  res.json({ requiresTwoFactor: false });
}));

authRouter.post("/logout", asyncHandler(async (req, res) => {
  clearPending2faToken(res);
  await destroySession(req, res);
  res.json({ ok: true });
}));
