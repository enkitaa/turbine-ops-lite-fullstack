// Types
export type { JwtUser, UserRole, JwtPayload, AuthConfig } from "../types/auth";

// Express request helpers
export { hasUser, requireUser } from "../types/express";

// Utilities
export { signJwt, verifyJwt, decodeJwt } from "../utils/jwt";
export { hashPassword, verifyPassword, validatePasswordStrength } from "../utils/password";
export { AuthService, createAuthService } from "../utils/auth";
