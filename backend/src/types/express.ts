import type { Request } from "express";

import type { JwtUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

// Type guard to check if a request has an authenticated user

export const hasUser = (req: Request): req is Request & { user: JwtUser } => {
  return req.user !== undefined;
};

// Helper to safely get the authenticated user from a request

export const requireUser = (req: Request): JwtUser => {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user;
};
