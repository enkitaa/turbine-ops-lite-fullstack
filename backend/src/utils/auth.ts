import type { JwtUser, AuthConfig } from "../types/auth";

import { signJwt, verifyJwt } from "./jwt";
import { hashPassword, verifyPassword, validatePasswordStrength } from "./password";

export class AuthService {
  private readonly config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  // Creates a JWT token for a user
  public createToken(user: JwtUser): string {
    return signJwt(user, this.config.jwtSecret, this.config.jwtExpiresIn);
  }

  // Verifies and decodes a JWT token
  public verifyToken(token: string): JwtUser {
    return verifyJwt(token, this.config.jwtSecret);
  }

  // Hashes a password
  public async hashPassword(password: string): Promise<string> {
    return hashPassword(password, this.config.bcryptRounds);
  }

  // Checks if a password matches its hash
  public async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return verifyPassword(password, hashedPassword);
  }

  // Validates password strength
  public validatePassword(password: string): { isValid: boolean; errors: string[] } {
    return validatePasswordStrength(password);
  }

  // Authenticates a user by verifying password and returning a token
  public async authenticateUser(
    user: JwtUser,
    password: string,
    hashedPassword: string,
  ): Promise<string> {
    const isValidPassword = await this.verifyPassword(password, hashedPassword);
    if (!isValidPassword) {
      throw new Error("Invalid password");
    }
    return this.createToken(user);
  }
}

// Creates a default AuthService instance using environment variables
export const createAuthService = (): AuthService => {
  const config: AuthConfig = {
    jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  };

  return new AuthService(config);
};
