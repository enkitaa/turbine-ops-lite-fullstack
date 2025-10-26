import bcrypt from "bcryptjs";

/**
 * Default number of bcrypt rounds for password hashing
 */
const DEFAULT_BCRYPT_ROUNDS = 12;

// Hashes a plain text password using bcrypt
export const hashPassword = async (
  password: string,
  rounds: number = DEFAULT_BCRYPT_ROUNDS,
): Promise<string> => {
  try {
    if (!password || password.length === 0) {
      throw new Error("Password cannot be empty");
    }

    if (rounds < 4 || rounds > 15) {
      throw new Error("Bcrypt rounds must be between 4 and 15");
    }

    const salt = await bcrypt.genSalt(rounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error(
      `Password hashing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Verifies a plain text password against a hashed password
export const verifyPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  try {
    if (!password || password.length === 0) {
      throw new Error("Password cannot be empty");
    }

    if (!hashedPassword || hashedPassword.length === 0) {
      throw new Error("Hashed password cannot be empty");
    }

    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error(
      `Password verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Validates password strength

export const validatePasswordStrength = (
  password: string,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must be no more than 128 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
