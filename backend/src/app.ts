import path from "path";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./env";
import { attachUser } from "./middleware/requireAuth";
import { csrfProtection, ensureCsrfCookie } from "./lib/csrf";
import { authRouter } from "./routes/auth";
import { twoFactorRouter } from "./routes/twoFactor";
import { meRouter } from "./routes/me";
import { adminRouter } from "./routes/admin";
import { firingCurvesRouter } from "./routes/firingCurves";
import { glazeCombinationsRouter } from "./routes/glazeCombinations";

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-origin" },
    })
  );

  if (!env.isProduction) {
    app.use(cors({ origin: env.devCorsOrigin, credentials: true }));
  }

  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use(ensureCsrfCookie);
  app.use(attachUser);

  const api = express.Router();
  api.use(csrfProtection);
  api.use("/auth", authRouter);
  api.use("/2fa", twoFactorRouter);
  api.use("/me", meRouter);
  api.use("/admin", adminRouter);
  api.use("/firing-curves", firingCurvesRouter);
  api.use("/glaze-combinations", glazeCombinationsRouter);
  app.use("/api", api);

  // Serve the built frontend (single-origin deployment keeps cookies simple
  // and needs no CORS in production).
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
