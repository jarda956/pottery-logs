import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(255);
export const passwordSchema = z.string().min(10).max(255);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  language: z.enum(["cs", "en"]).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(255),
});

export const verify2faSchema = z.object({
  token: z.string().trim().min(6).max(64),
});

export const disable2faSchema = z.object({
  password: z.string().min(1).max(255),
});

export const updateLanguageSchema = z.object({
  language: z.enum(["cs", "en"]),
});

export const adminCreateUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

const segmentSchema = z.object({
  targetTempC: z.number().int().min(0).max(1400),
  rateCPerHour: z.number().int().min(1).max(2000).optional(),
  holdMinutes: z.number().int().min(0).max(1440).optional(),
});

export const firingCurveSchema = z.object({
  name: z.string().trim().min(1).max(150),
  controller: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional().nullable(),
  maxTempC: z.number().int().min(0).max(1400).optional().nullable(),
  segments: z.array(segmentSchema).min(1).max(50),
});

const glazeLayerSchema = z.object({
  name: z.string().trim().min(1).max(150),
  manufacturer: z.string().trim().max(150).optional().nullable(),
  layers: z.number().int().min(1).max(20).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const glazeCombinationSchema = z.object({
  name: z.string().trim().min(1).max(150),
  clayBody: z.string().trim().max(150).optional().nullable(),
  firingTempC: z.number().int().min(0).max(1400).optional().nullable(),
  firingCone: z.string().trim().max(20).optional().nullable(),
  glazes: z.array(glazeLayerSchema).min(1).max(20),
  result: z.string().trim().max(2000).optional().nullable(),
});
