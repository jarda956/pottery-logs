import type { NextFunction, Request, Response } from "express";

// Defense in depth: admin accounts must have 2FA enabled (enforced by the
// frontend redirecting to /setup-2fa), but that's only a UI nicety. Block it
// server-side too, so a leaked admin password alone can't reach anything
// beyond /api/me and /api/2fa/* (needed to finish enabling 2FA).
export function requireTwoFactorForAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user && req.user.role === "ADMIN" && !req.user.totpEnabled) {
    res.status(403).json({ error: "admin_2fa_setup_required" });
    return;
  }
  next();
}
