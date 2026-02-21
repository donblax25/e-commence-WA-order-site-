import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      issues: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
    return res.status(409).json({ message: "Record already exists" });
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  console.error(err);
  return res.status(500).json({ message });
}
