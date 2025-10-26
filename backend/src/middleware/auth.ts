import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "../types/auth";
import { verifyJwt } from "../utils/jwt";

export const requireAuth = (req: Request, res: Response, next: NextFunction): Response | void => {
  try {
    const authHeader: string | undefined = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing Authorization header",
      });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid Authorization header format. Expected: Bearer <token>",
      });
    }

    const token: string = parts[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Server configuration error",
      });
    }

    const user = verifyJwt(token, jwtSecret);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      message: error instanceof Error ? error.message : "Invalid or expired token",
    });
  }
};

// Middleware to require specific roles

export const requireRole = (
  ...allowedRoles: UserRole[]
): ((req: Request, res: Response, next: NextFunction) => Response | void) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};
