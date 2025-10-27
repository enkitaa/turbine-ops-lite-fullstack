// Test setup file - run before all tests
import { config } from "dotenv";

// Load environment variables from .env.test if it exists
try {
  config({ path: ".env.test" });
} catch (error) {
  // .env.test doesn't exist, that's okay
}

// Set default DATABASE_URL for tests if not already set
// Use the main database 'turbineops' for tests - it should be seeded with test data
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://app:app@localhost:5432/turbineops";
}

// Set JWT_SECRET if not already set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-key";
}

// Set JWT_EXPIRES_IN if not already set
if (!process.env.JWT_EXPIRES_IN) {
  process.env.JWT_EXPIRES_IN = "24h";
}

// Set BCRYPT_ROUNDS if not already set
if (!process.env.BCRYPT_ROUNDS) {
  process.env.BCRYPT_ROUNDS = "12";
}
