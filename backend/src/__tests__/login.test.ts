import type { Express } from "express";
import express from "express";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { loginHandler } from "../routes/auth";

describe("POST /api/auth/login", () => {
  let app: Express;
  let prisma: PrismaClient;
  let testUser: { id: string; email: string; name: string; passwordHash: string; role: string };

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = express();
    app.use(express.json());
    app.post("/api/auth/login", loginHandler);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create a test user with a known password
    const testPassword = "TestPassword123!";
    const passwordHash = await bcrypt.hash(testPassword, 10);

    testUser = await prisma.user.upsert({
      where: { email: "testuser@example.com" },
      update: {
        passwordHash,
        role: "VIEWER",
        name: "Test User",
      },
      create: {
        email: "testuser@example.com",
        name: "Test User",
        passwordHash,
        role: "VIEWER",
      },
    });
  });

  afterEach(async () => {
    // Clean up test user
    try {
      await prisma.user.delete({ where: { email: "testuser@example.com" } });
    } catch (error) {
      // Ignore if user doesn't exist
    }
  });

  describe("valid credentials", () => {
    it("should return JWT token and user info on successful login", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "TestPassword123!",
        })
        .expect(200);

      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
      });
      expect(typeof response.body.token).toBe("string");
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it("should return token for ADMIN user", async () => {
      // Create admin user
      const adminPassword = "AdminPassword123!";
      const adminHash = await bcrypt.hash(adminPassword, 10);
      const admin = await prisma.user.upsert({
        where: { email: "admin-test@example.com" },
        update: {
          passwordHash: adminHash,
          role: "ADMIN",
          name: "Admin User",
        },
        create: {
          email: "admin-test@example.com",
          name: "Admin User",
          passwordHash: adminHash,
          role: "ADMIN",
        },
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: admin.email,
          password: adminPassword,
        })
        .expect(200);

      expect(response.body.user.role).toBe("ADMIN");

      // Cleanup
      await prisma.user.delete({ where: { id: admin.id } });
    });

    it("should return token for ENGINEER user", async () => {
      const engineerPassword = "EngineerPassword123!";
      const engineerHash = await bcrypt.hash(engineerPassword, 10);
      const engineer = await prisma.user.upsert({
        where: { email: "engineer-test@example.com" },
        update: {
          passwordHash: engineerHash,
          role: "ENGINEER",
          name: "Engineer User",
        },
        create: {
          email: "engineer-test@example.com",
          name: "Engineer User",
          passwordHash: engineerHash,
          role: "ENGINEER",
        },
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: engineer.email,
          password: engineerPassword,
        })
        .expect(200);

      expect(response.body.user.role).toBe("ENGINEER");

      // Cleanup
      await prisma.user.delete({ where: { id: engineer.id } });
    });
  });

  describe("missing fields", () => {
    it("should return 400 when email is missing", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          password: "TestPassword123!",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body).toHaveProperty("message", "Email and password are required");
    });

    it("should return 400 when password is missing", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
        })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body).toHaveProperty("message", "Email and password are required");
    });

    it("should return 400 when both email and password are missing", async () => {
      const response = await request(app).post("/api/auth/login").send({}).expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body).toHaveProperty("message", "Email and password are required");
    });

    it("should return 400 when email is empty string", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "",
          password: "TestPassword123!",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
    });

    it("should return 400 when password is empty string", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
    });
  });

  describe("invalid credentials", () => {
    it("should return 401 when email does not exist", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "TestPassword123!",
        })
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
      expect(response.body).toHaveProperty("message", "Invalid email or password");
    });

    it("should return 401 when password is incorrect", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "WrongPassword123!",
        })
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
      expect(response.body).toHaveProperty("message", "Invalid email or password");
    });

    it("should return 401 for wrong password even for valid email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "completelyWrongPassword",
        })
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
    });
  });

  describe("edge cases", () => {
    it("should handle email with different case", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email.toUpperCase(),
          password: "TestPassword123!",
        })
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
    });

    it("should not expose user password hash in response", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "TestPassword123!",
        })
        .expect(200);

      expect(response.body.user).not.toHaveProperty("passwordHash");
      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should return proper user fields in response", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "TestPassword123!",
        })
        .expect(200);

      const user = response.body.user;
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("role");
      expect(Object.keys(user).length).toBe(4);
    });

    it("should return JWT token in correct format", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "TestPassword123!",
        })
        .expect(200);

      const token = response.body.token;
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
    });

    it("should handle multiple rapid login attempts", async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app).post("/api/auth/login").send({
          email: testUser.email,
          password: "TestPassword123!",
        }),
      );

      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect([200, 401]).toContain(response.status);
      });
    });
  });
});
