import jwt from "jsonwebtoken";

import type { JwtUser, JwtPayload } from "../types/auth.js";

// Signs a JWT token with the provided user information

export const signJwt = (user: JwtUser, secret: string, expiresIn: string = "24h"): string => {
  try {
    const payload = { ...user };
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  } catch (error) {
    throw new Error(
      `Failed to sign JWT: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Verify a JWT and get the user info

export const verifyJwt = (token: string, secret: string): JwtUser => {
  try {
    const payload = jwt.verify(token, secret) as JwtPayload;

    // Validate that the payload contains required user fields
    if (!payload.id || !payload.email || !payload.role) {
      throw new Error("Invalid JWT payload: missing required fields");
    }

    // Validate role is one of the allowed values
    const validRoles = ["ADMIN", "ENGINEER", "VIEWER"] as const;
    if (!validRoles.includes(payload.role)) {
      throw new Error(`Invalid user role: ${payload.role}`);
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("JWT token has expired");
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new Error("JWT token not active");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error(
      `JWT verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Decode a JWT without verification (useful for debugging)
export const decodeJwt = (token: string): JwtPayload => {
  try {
    const payload = jwt.decode(token) as JwtPayload;
    if (!payload) {
      throw new Error("Unable to decode JWT token");
    }
    return payload;
  } catch (error) {
    throw new Error(
      `Failed to decode JWT: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
