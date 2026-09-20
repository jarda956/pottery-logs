import type { NextFunction, Request, Response } from "express";
import { loadSessionUser } from "../lib/sessions";

export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  loadSessionUser(req)
    .then((user) => {
      req.user = user ?? undefined;
      next();
    })
    .catch(next);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }
  next();
}
