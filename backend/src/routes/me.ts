import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { updateLanguageSchema } from "../validation/schemas";
import { asyncHandler } from "../lib/asyncHandler";

export const meRouter = Router();

function serializeUser(user: {
  id: string;
  email: string;
  role: string;
  language: string;
  totpEnabled: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    language: user.language,
    totpEnabled: user.totpEnabled,
    mustSetupTwoFactor: user.role === "ADMIN" && !user.totpEnabled,
    createdAt: user.createdAt,
  };
}

meRouter.get("/", requireAuth, (req, res) => {
  res.json(serializeUser(req.user!));
});

meRouter.patch("/language", requireAuth, asyncHandler(async (req, res) => {
  const parsed = updateLanguageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { language: parsed.data.language },
  });

  res.json(serializeUser(user));
}));
