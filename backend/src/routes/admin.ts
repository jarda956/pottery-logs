import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireTwoFactorForAdmin } from "../middleware/requireTwoFactorForAdmin";
import { adminCreateUserSchema } from "../validation/schemas";
import { hashSecret, validatePasswordStrength } from "../lib/password";
import { destroyAllSessionsForUser } from "../lib/sessions";
import { logAudit } from "../lib/audit";
import { asyncHandler } from "../lib/asyncHandler";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin, requireTwoFactorForAdmin);

function serializeUser(user: {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  totpEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    totpEnabled: user.totpEnabled,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

adminRouter.get("/users", asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  res.json(users.map(serializeUser));
}));

adminRouter.post("/users", asyncHandler(async (req, res) => {
  const parsed = adminCreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const { email, password, role } = parsed.data;

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "email_taken" });
    return;
  }

  const passwordHash = await hashSecret(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, role },
  });

  await logAudit(req.user!.id, "admin.user_created", user.id, `role=${role}`);
  res.status(201).json(serializeUser(user));
}));

adminRouter.delete("/users/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === req.user!.id) {
    res.status(400).json({ error: "cannot_delete_self" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  await prisma.user.delete({ where: { id } });
  await logAudit(req.user!.id, "admin.user_deleted", id, target.email);
  res.json({ ok: true });
}));

adminRouter.patch("/users/:id/activate", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const user = await prisma.user.update({ where: { id }, data: { isActive: true } });
  await logAudit(req.user!.id, "admin.user_activated", id);
  res.json(serializeUser(user));
}));

adminRouter.patch("/users/:id/deactivate", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === req.user!.id) {
    res.status(400).json({ error: "cannot_deactivate_self" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
  await destroyAllSessionsForUser(id);
  await logAudit(req.user!.id, "admin.user_deactivated", id);
  res.json(serializeUser(user));
}));
