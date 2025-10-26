import { hashPassword, verifyPassword, validatePasswordStrength } from "../utils/password";

describe("Password Utilities", () => {
  const testPassword = "TestPassword123!";
  const weakPassword = "123";
  const strongPassword = "StrongPassword123!@#";

  describe("hashPassword", () => {
    it("should hash a password successfully", async () => {
      const hashedPassword = await hashPassword(testPassword);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it("should throw error for empty password", async () => {
      await expect(hashPassword("")).rejects.toThrow("Password cannot be empty");
    });

    it("should throw error for invalid rounds", async () => {
      await expect(hashPassword(testPassword, 3)).rejects.toThrow(
        "Bcrypt rounds must be between 4 and 15",
      );
      await expect(hashPassword(testPassword, 16)).rejects.toThrow(
        "Bcrypt rounds must be between 4 and 15",
      );
    });

    it("should produce different hashes for the same password", async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await verifyPassword(testPassword, hashedPassword);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await verifyPassword("wrongpassword", hashedPassword);

      expect(isValid).toBe(false);
    });

    it("should throw error for empty password", async () => {
      const hashedPassword = await hashPassword(testPassword);

      await expect(verifyPassword("", hashedPassword)).rejects.toThrow("Password cannot be empty");
    });

    it("should throw error for empty hashed password", async () => {
      await expect(verifyPassword(testPassword, "")).rejects.toThrow(
        "Hashed password cannot be empty",
      );
    });
  });

  describe("validatePasswordStrength", () => {
    it("should validate strong password", () => {
      const result = validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject weak password", () => {
      const result = validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should require minimum length", () => {
      const result = validatePasswordStrength("Ab1!");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should require uppercase letter", () => {
      const result = validatePasswordStrength("lowercase123!");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should require lowercase letter", () => {
      const result = validatePasswordStrength("UPPERCASE123!");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should require number", () => {
      const result = validatePasswordStrength("NoNumbers!");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should require special character", () => {
      const result = validatePasswordStrength("NoSpecialChars123");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one special character");
    });

    it("should reject too long password", () => {
      const longPassword = "a".repeat(129) + "A1!";
      const result = validatePasswordStrength(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must be no more than 128 characters long");
    });

    it("should handle empty password", () => {
      const result = validatePasswordStrength("");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password is required");
    });
  });
});
