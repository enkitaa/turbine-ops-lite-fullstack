import type { JwtUser } from "../types/auth";
import { signJwt, verifyJwt, decodeJwt } from "../utils/jwt";

describe("JWT Utilities", () => {
  const testSecret = "test-secret-key";
  const testUser: JwtUser = {
    id: "user-123",
    email: "test@example.com",
    role: "ADMIN",
  };

  describe("signJwt", () => {
    it("should sign a JWT token successfully", () => {
      const token = signJwt(testUser, testSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should sign a JWT token with custom expiration", () => {
      const token = signJwt(testUser, testSecret, "1h");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should produce different tokens for different users", () => {
      const user1: JwtUser = { id: "1", email: "user1@test.com", role: "VIEWER" };
      const user2: JwtUser = { id: "2", email: "user2@test.com", role: "ENGINEER" };

      const token1 = signJwt(user1, testSecret);
      const token2 = signJwt(user2, testSecret);

      expect(token1).not.toBe(token2);
    });

    it("should throw error for invalid secret", () => {
      expect(() => signJwt(testUser, "")).toThrow("Failed to sign JWT");
    });
  });

  describe("verifyJwt", () => {
    it("should verify a valid JWT token", () => {
      const token = signJwt(testUser, testSecret);
      const decoded = verifyJwt(token, testSecret);

      expect(decoded).toEqual(testUser);
    });

    it("should throw error for invalid token", () => {
      const invalidToken = "invalid.token.here";

      expect(() => verifyJwt(invalidToken, testSecret)).toThrow("JWT verification failed");
    });

    it("should throw error for wrong secret", () => {
      const token = signJwt(testUser, testSecret);
      const wrongSecret = "wrong-secret";

      expect(() => verifyJwt(token, wrongSecret)).toThrow("JWT verification failed");
    });

    it("should throw error for expired token", () => {
      const expiredToken = signJwt(testUser, testSecret, "-1h"); // Expired 1 hour ago

      expect(() => verifyJwt(expiredToken, testSecret)).toThrow("JWT token has expired");
    });

    it("should throw error for token with invalid payload", () => {
      // Create a token with invalid payload by manually constructing it
      const invalidPayload = { invalid: "payload" };
      const token = signJwt(invalidPayload as unknown as JwtUser, testSecret);

      expect(() => verifyJwt(token, testSecret)).toThrow(
        "Invalid JWT payload: missing required fields",
      );
    });

    it("should throw error for token with invalid role", () => {
      const invalidUser = { ...testUser, role: "INVALID_ROLE" as JwtUser["role"] };
      const token = signJwt(invalidUser, testSecret);

      expect(() => verifyJwt(token, testSecret)).toThrow("Invalid user role: INVALID_ROLE");
    });

    it("should verify tokens with different roles", () => {
      const roles: Array<JwtUser["role"]> = ["ADMIN", "ENGINEER", "VIEWER"];

      roles.forEach((role) => {
        const user = { ...testUser, role };
        const token = signJwt(user, testSecret);
        const decoded = verifyJwt(token, testSecret);

        expect(decoded.role).toBe(role);
      });
    });
  });

  describe("decodeJwt", () => {
    it("should decode a valid JWT token", () => {
      const token = signJwt(testUser, testSecret);
      const decoded = decodeJwt(token);

      expect(decoded.id).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it("should throw error for invalid token format", () => {
      const invalidToken = "not.a.jwt";

      expect(() => decodeJwt(invalidToken)).toThrow("Failed to decode JWT");
    });

    it("should throw error for empty token", () => {
      expect(() => decodeJwt("")).toThrow("Failed to decode JWT");
    });
  });

  describe("JWT Integration", () => {
    it("should sign and verify a complete flow", () => {
      const originalUser: JwtUser = {
        id: "integration-test-123",
        email: "integration@test.com",
        role: "ENGINEER",
      };

      // Sign the token
      const token = signJwt(originalUser, testSecret, "1h");

      // Verify the token
      const verifiedUser = verifyJwt(token, testSecret);

      // Check that the verified user matches the original
      expect(verifiedUser).toEqual(originalUser);
    });

    it("should handle multiple users with different roles", () => {
      const users: JwtUser[] = [
        { id: "1", email: "admin@test.com", role: "ADMIN" },
        { id: "2", email: "engineer@test.com", role: "ENGINEER" },
        { id: "3", email: "viewer@test.com", role: "VIEWER" },
      ];

      users.forEach((user) => {
        const token = signJwt(user, testSecret);
        const verified = verifyJwt(token, testSecret);

        expect(verified).toEqual(user);
      });
    });
  });
});
