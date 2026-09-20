import type { NextFunction, Request, Response } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }
  if (req.user.role !== "ADMIN") {
    res.status(403).json({ error: "admin_required" });
    return;
  }
  next();
}
