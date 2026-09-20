import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { twoFactorRateLimiter } from "../middleware/rateLimiters";
import {
  clearPending2faToken,
  createSession,
  readPending2faToken,
} from "../lib/sessions";
import { buildTotpQrCodeDataUrl, generateTotpSecret, verifyTotpToken } from "../lib/totp";
import { disable2faSchema, verify2faSchema } from "../validation/schemas";
import { generateBackupCodes, hashSecret, verifySecret } from "../lib/password";
import { logAudit } from "../lib/audit";
import { asyncHandler } from "../lib/asyncHandler";

export const twoFactorRouter = Router();

// Step 2 of login for accounts with 2FA enabled: exchange the short-lived
// pending token + a valid TOTP code (or backup code) for a real session.
twoFactorRouter.post("/verify-login", twoFactorRateLimiter, asyncHandler(async (req, res) => {
  const parsed = verify2faSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }

  const userId = readPending2faToken(req);
  if (!userId) {
    res.status(401).json({ error: "pending_2fa_expired" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || !user.totpEnabled || !user.totpSecret) {
    clearPending2faToken(res);
    res.status(401).json({ error: "invalid_state" });
    return;
  }

  const token = parsed.data.token.replace(/\s+/g, "");
  let ok = verifyTotpToken(user.totpSecret, token);

  if (!ok && user.totpBackupCodes) {
    const backupCodes: string[] = JSON.parse(user.totpBackupCodes);
    for (let i = 0; i < backupCodes.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      if (await verifySecret(backupCodes[i], token)) {
        ok = true;
        backupCodes.splice(i, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { totpBackupCodes: JSON.stringify(backupCodes) },
        });
        break;
      }
    }
  }

  if (!ok) {
    res.status(401).json({ error: "invalid_code" });
    return;
  }

  clearPending2faToken(res);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(req, res, user.id);
  await logAudit(user.id, "user.login_2fa", user.id);
  res.json({ ok: true });
}));

// Step 1 of enabling 2FA (user must already be logged in): generate a new
// secret and return it as a QR code. Not yet active until /enable confirms
// the user can actually produce a valid code.
twoFactorRouter.post("/setup", requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  const secret = generateTotpSecret();

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  const qrCodeDataUrl = await buildTotpQrCodeDataUrl(user.email, secret);
  res.json({ secret, qrCodeDataUrl });
}));

twoFactorRouter.post("/enable", requireAuth, twoFactorRateLimiter, asyncHandler(async (req, res) => {
  const parsed = verify2faSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.totpSecret) {
    res.status(400).json({ error: "setup_not_started" });
    return;
  }

  const ok = verifyTotpToken(user.totpSecret, parsed.data.token.replace(/\s+/g, ""));
  if (!ok) {
    res.status(400).json({ error: "invalid_code" });
    return;
  }

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = await Promise.all(backupCodes.map((code) => hashSecret(code)));

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, totpBackupCodes: JSON.stringify(hashedBackupCodes) },
  });

  await logAudit(user.id, "user.2fa_enabled", user.id);
  res.json({ ok: true, backupCodes });
}));

twoFactorRouter.post("/disable", requireAuth, asyncHandler(async (req, res) => {
  if (req.user!.role === "ADMIN") {
    res.status(403).json({ error: "admin_2fa_required" });
    return;
  }

  const parsed = disable2faSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }

  const validPassword = await verifySecret(user.passwordHash, parsed.data.password);
  if (!validPassword) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpBackupCodes: null },
  });

  await logAudit(user.id, "user.2fa_disabled", user.id);
  res.json({ ok: true });
}));
