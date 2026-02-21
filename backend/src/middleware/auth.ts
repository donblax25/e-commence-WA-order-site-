import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config.js";

export type AdminJwtPayload = {
  adminId: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = auth.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
