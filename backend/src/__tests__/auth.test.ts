import type { AuthConfig, JwtUser } from "../types/auth";
import { AuthService, createAuthService } from "../utils/auth";

describe("AuthService", () => {
  const testConfig: AuthConfig = {
    jwtSecret: "test-secret-key",
    jwtExpiresIn: "1h",
    bcryptRounds: 4,
  };

  const testUser: JwtUser = {
    id: "test-user-123",
    email: "test@example.com",
    role: "ADMIN",
  };

  const testPassword = "TestPassword123!";

  describe("constructor", () => {
    it("should create AuthService with valid config", () => {
      const authService = new AuthService(testConfig);
      expect(authService).toBeInstanceOf(AuthService);
    });
  });

  describe("createToken", () => {
    it("should create a JWT token", () => {
      const authService = new AuthService(testConfig);
      const token = authService.createToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", () => {
      const authService = new AuthService(testConfig);
      const token = authService.createToken(testUser);
      const verifiedUser = authService.verifyToken(token);

      expect(verifiedUser).toEqual(testUser);
    });

    it("should throw error for invalid token", () => {
      const authService = new AuthService(testConfig);

      expect(() => authService.verifyToken("invalid-token")).toThrow("JWT verification failed");
    });
  });

  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const authService = new AuthService(testConfig);
      const hashedPassword = await authService.hashPassword(testPassword);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const authService = new AuthService(testConfig);
      const hashedPassword = await authService.hashPassword(testPassword);
      const isValid = await authService.verifyPassword(testPassword, hashedPassword);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const authService = new AuthService(testConfig);
      const hashedPassword = await authService.hashPassword(testPassword);
      const isValid = await authService.verifyPassword("wrong-password", hashedPassword);

      expect(isValid).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should validate strong password", () => {
      const authService = new AuthService(testConfig);
      const result = authService.validatePassword(testPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject weak password", () => {
      const authService = new AuthService(testConfig);
      const result = authService.validatePassword("weak");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("authenticateUser", () => {
    it("should authenticate user with correct password", async () => {
      const authService = new AuthService(testConfig);
      const hashedPassword = await authService.hashPassword(testPassword);
      const token = await authService.authenticateUser(testUser, testPassword, hashedPassword);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const verifiedUser = authService.verifyToken(token);
      expect(verifiedUser).toEqual(testUser);
    });

    it("should reject authentication with incorrect password", async () => {
      const authService = new AuthService(testConfig);
      const hashedPassword = await authService.hashPassword(testPassword);

      await expect(
        authService.authenticateUser(testUser, "wrong-password", hashedPassword),
      ).rejects.toThrow("Invalid password");
    });
  });

  describe("createAuthService", () => {
    it("should create AuthService with environment variables", () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        JWT_SECRET: "env-secret",
        JWT_EXPIRES_IN: "2h",
        BCRYPT_ROUNDS: "8",
      };

      const authService = createAuthService();
      expect(authService).toBeInstanceOf(AuthService);

      // Restore environment
      process.env = originalEnv;
    });

    it("should use default values when environment variables are not set", () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {};

      const authService = createAuthService();
      expect(authService).toBeInstanceOf(AuthService);

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete authentication flow", async () => {
      const authService = new AuthService(testConfig);
      const user: JwtUser = {
        id: "integration-user",
        email: "integration@test.com",
        role: "ENGINEER",
      };
      const password = "IntegrationTest123!";

      // Hash password
      const hashedPassword = await authService.hashPassword(password);

      // Authenticate user
      const token = await authService.authenticateUser(user, password, hashedPassword);

      // Verify token
      const verifiedUser = authService.verifyToken(token);

      // Check everything matches
      expect(verifiedUser).toEqual(user);
    });

    it("should handle different user roles", async () => {
      const authService = new AuthService(testConfig);
      const roles: JwtUser["role"][] = ["ADMIN", "ENGINEER", "VIEWER"];
      const password = "RoleTest123!";

      for (const role of roles) {
        const user: JwtUser = {
          id: `user-${role.toLowerCase()}`,
          email: `${role.toLowerCase()}@test.com`,
          role,
        };

        const hashedPassword = await authService.hashPassword(password);
        const token = await authService.authenticateUser(user, password, hashedPassword);
        const verifiedUser = authService.verifyToken(token);

        expect(verifiedUser.role).toBe(role);
      }
    });
  });
});
