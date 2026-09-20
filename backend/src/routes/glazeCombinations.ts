import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { requireTwoFactorForAdmin } from "../middleware/requireTwoFactorForAdmin";
import { glazeCombinationSchema } from "../validation/schemas";
import { asyncHandler } from "../lib/asyncHandler";

export const glazeCombinationsRouter = Router();

glazeCombinationsRouter.use(requireAuth, requireTwoFactorForAdmin);

function serialize(combo: {
  id: string;
  name: string;
  clayBody: string | null;
  firingTempC: number | null;
  firingCone: string | null;
  glazes: string;
  result: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: combo.id,
    name: combo.name,
    clayBody: combo.clayBody,
    firingTempC: combo.firingTempC,
    firingCone: combo.firingCone,
    glazes: JSON.parse(combo.glazes),
    result: combo.result,
    createdAt: combo.createdAt,
    updatedAt: combo.updatedAt,
  };
}

glazeCombinationsRouter.get("/", asyncHandler(async (req, res) => {
  const combos = await prisma.glazeCombination.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(combos.map(serialize));
}));

glazeCombinationsRouter.post("/", asyncHandler(async (req, res) => {
  const parsed = glazeCombinationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const { name, clayBody, firingTempC, firingCone, glazes, result } = parsed.data;

  const combo = await prisma.glazeCombination.create({
    data: {
      userId: req.user!.id,
      name,
      clayBody: clayBody ?? null,
      firingTempC: firingTempC ?? null,
      firingCone: firingCone ?? null,
      glazes: JSON.stringify(glazes),
      result: result ?? null,
    },
  });

  res.status(201).json(serialize(combo));
}));

glazeCombinationsRouter.put("/:id", asyncHandler(async (req, res) => {
  const parsed = glazeCombinationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.glazeCombination.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const { name, clayBody, firingTempC, firingCone, glazes, result } = parsed.data;
  const combo = await prisma.glazeCombination.update({
    where: { id: existing.id },
    data: {
      name,
      clayBody: clayBody ?? null,
      firingTempC: firingTempC ?? null,
      firingCone: firingCone ?? null,
      glazes: JSON.stringify(glazes),
      result: result ?? null,
    },
  });

  res.json(serialize(combo));
}));

glazeCombinationsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.glazeCombination.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  await prisma.glazeCombination.delete({ where: { id: existing.id } });
  res.json({ ok: true });
}));
