// Types
export type { JwtUser, UserRole, JwtPayload, AuthConfig } from "../types/auth.js";

// Express request helpers
export { hasUser, requireUser } from "../types/express.js";

// Utilities
export { signJwt, verifyJwt, decodeJwt } from "../utils/jwt.js";
export { hashPassword, verifyPassword, validatePasswordStrength } from "../utils/password.js";
export { AuthService, createAuthService } from "../utils/auth.js";

// Middleware
export { requireAuth, requireRole } from "../middleware/auth.js";
export { errorHandler, notFoundHandler } from "../middleware/error.js";
