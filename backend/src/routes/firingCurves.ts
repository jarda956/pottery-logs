import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { requireTwoFactorForAdmin } from "../middleware/requireTwoFactorForAdmin";
import { firingCurveSchema } from "../validation/schemas";
import { asyncHandler } from "../lib/asyncHandler";

export const firingCurvesRouter = Router();

firingCurvesRouter.use(requireAuth, requireTwoFactorForAdmin);

function serialize(curve: {
  id: string;
  name: string;
  controller: string;
  description: string | null;
  maxTempC: number | null;
  segments: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: curve.id,
    name: curve.name,
    controller: curve.controller,
    description: curve.description,
    maxTempC: curve.maxTempC,
    segments: JSON.parse(curve.segments),
    createdAt: curve.createdAt,
    updatedAt: curve.updatedAt,
  };
}

firingCurvesRouter.get("/", asyncHandler(async (req, res) => {
  const curves = await prisma.firingCurve.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(curves.map(serialize));
}));

firingCurvesRouter.post("/", asyncHandler(async (req, res) => {
  const parsed = firingCurveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const { name, controller, description, maxTempC, segments } = parsed.data;

  const curve = await prisma.firingCurve.create({
    data: {
      userId: req.user!.id,
      name,
      controller,
      description: description ?? null,
      maxTempC: maxTempC ?? null,
      segments: JSON.stringify(segments),
    },
  });

  res.status(201).json(serialize(curve));
}));

firingCurvesRouter.put("/:id", asyncHandler(async (req, res) => {
  const parsed = firingCurveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.firingCurve.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const { name, controller, description, maxTempC, segments } = parsed.data;
  const curve = await prisma.firingCurve.update({
    where: { id: existing.id },
    data: {
      name,
      controller,
      description: description ?? null,
      maxTempC: maxTempC ?? null,
      segments: JSON.stringify(segments),
    },
  });

  res.json(serialize(curve));
}));

firingCurvesRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.firingCurve.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  await prisma.firingCurve.delete({ where: { id: existing.id } });
  res.json({ ok: true });
}));
