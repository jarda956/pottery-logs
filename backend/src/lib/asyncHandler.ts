import type { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 does not forward rejected promises from async handlers to the
// error middleware, so an unexpected error inside one (a bad Prisma query,
// a thrown exception, ...) becomes an unhandled rejection that crashes the
// whole process. Wrapping every async handler funnels those into next(err).
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
