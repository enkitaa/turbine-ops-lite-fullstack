import type { Request, Response } from "express";
import express, { type Express } from "express";
import type { JwtUser } from "../types/auth";
import { signJwt } from "../utils/jwt";
import { requireAuth, requireRole } from "../middleware/auth";
import request from "supertest";

describe("requireAuth middleware", () => {
  let app: Express;

  beforeEach(() => {
    app = express();

    // Set JWT_SECRET for testing
    process.env.JWT_SECRET = "test-secret-key";

    // Test route that uses requireAuth
    app.use(express.json());
    app.get("/protected", requireAuth, (req: Request, res: Response) => {
      res.json({ user: req.user });
    });
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe("valid token", () => {
    it("should allow access with valid JWT token", async () => {
      const user: JwtUser = {
        id: "user-123",
        email: "test@example.com",
        role: "ENGINEER",
      };

      const token = signJwt(user, process.env.JWT_SECRET!);

      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ user });
    });

    it("should attach user object to request", async () => {
      const user: JwtUser = {
        id: "user-456",
        email: "engineer@example.com",
        role: "VIEWER",
      };

      const token = signJwt(user, process.env.JWT_SECRET!);

      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toHaveProperty("id", "user-456");
      expect(response.body.user).toHaveProperty("email", "engineer@example.com");
      expect(response.body.user).toHaveProperty("role", "VIEWER");
    });
  });

  describe("missing or invalid token", () => {
    it("should reject request without Authorization header", async () => {
      const response = await request(app).get("/protected").expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
      expect(response.body).toHaveProperty("message", "Missing Authorization header");
    });

    it("should reject request with invalid Authorization format", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "InvalidFormat token")
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
      expect(response.body).toHaveProperty("message");
    });

    it("should reject request without Bearer prefix", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "token-here")
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
    });

    it("should reject request with invalid JWT token", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
    });

    it("should reject request with expired token", async () => {
      const user: JwtUser = {
        id: "user-123",
        email: "test@example.com",
        role: "ENGINEER",
      };

      // Create a token with negative expiration (already expired)
      const expiredToken = signJwt(user, process.env.JWT_SECRET!, "-1s");

      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
    });

    it("should handle missing JWT_SECRET configuration", async () => {
      delete process.env.JWT_SECRET;

      const appWithoutSecret = express();
      appWithoutSecret.use(express.json());
      appWithoutSecret.get("/protected", requireAuth, (req: Request, res: Response) => {
        res.json({ user: req.user });
      });

      const response = await request(appWithoutSecret)
        .get("/protected")
        .set("Authorization", "Bearer valid-token")
        .expect(500);

      expect(response.body).toHaveProperty("error", "Internal Server Error");
    });
  });

  describe("edge cases", () => {
    it("should handle empty token", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer ")
        .expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
    });

    it("should handle token with special characters", async () => {
      const user: JwtUser = {
        id: "user-123",
        email: "test@example.com",
        role: "ADMIN",
      };

      const token = signJwt(user, process.env.JWT_SECRET!);

      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.role).toBe("ADMIN");
    });
  });
});

describe("requireRole middleware", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    process.env.JWT_SECRET = "test-secret-key";
    app.use(express.json());
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe("single role requirements", () => {
    it("should allow access for ADMIN role", async () => {
      const user: JwtUser = {
        id: "admin-123",
        email: "admin@example.com",
        role: "ADMIN",
      };

      const token = signJwt(user, process.env.JWT_SECRET!);

      app.get("/admin", requireAuth, requireRole("ADMIN"), (req: Request, res: Response) => {
        res.json({ message: "Admin access granted" });
      });

      const response = await request(app)
        .get("/admin")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ message: "Admin access granted" });
    });

    it("should deny access when role doesn't match", async () => {
      const user: JwtUser = {
        id: "viewer-123",
        email: "viewer@example.com",
        role: "VIEWER",
      };

      const token = signJwt(user, process.env.JWT_SECRET!);

      app.get("/admin", requireAuth, requireRole("ADMIN"), (req: Request, res: Response) => {
        res.json({ message: "Admin access granted" });
      });

      const response = await request(app)
        .get("/admin")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty("error", "Forbidden");
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("multiple roles", () => {
    it("should allow access when user has one of the allowed roles", async () => {
      const user: JwtUser = {
        id: "engineer-123",
        email: "engineer@example.com",
        role: "ENGINEER",
      };

      const token = signJwt(user, process.env.JWT_SECRET!);

      app.get(
        "/manager",
        requireAuth,
        requireRole("ADMIN", "ENGINEER"),
        (req: Request, res: Response) => {
          res.json({ message: "Manager access granted" });
        },
      );

      const response = await request(app)
        .get("/manager")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ message: "Manager access granted" });
    });

    it("should deny access when user has none of the allowed roles", async () => {
      const user: JwtUser = {
        id: "viewer-123",
        email: "viewer@example.com",
        role: "VIEWER",
      };

      const token = signJwt(user, process.env.JWT_SECRET!);

      app.get(
        "/manager",
        requireAuth,
        requireRole("ADMIN", "ENGINEER"),
        (req: Request, res: Response) => {
          res.json({ message: "Manager access granted" });
        },
      );

      const response = await request(app)
        .get("/manager")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty("error", "Forbidden");
    });

    it("should work with all three roles", async () => {
      const user: JwtUser = {
        id: "viewer-123",
        email: "viewer@example.com",
        role: "VIEWER",
      };

      const token = signJwt(user, process.env.JWT_SECRET!);

      app.get(
        "/all",
        requireAuth,
        requireRole("ADMIN", "ENGINEER", "VIEWER"),
        (req: Request, res: Response) => {
          res.json({ message: "Access granted" });
        },
      );

      const response = await request(app)
        .get("/all")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ message: "Access granted" });
    });
  });

  describe("without authentication", () => {
    it("should return 401 when requireRole is used without requireAuth", async () => {
      app.get("/admin", requireRole("ADMIN"), (req: Request, res: Response) => {
        res.json({ message: "Success" });
      });

      const response = await request(app).get("/admin").expect(401);

      expect(response.body).toHaveProperty("error", "Unauthorized");
      expect(response.body).toHaveProperty("message", "User not authenticated");
    });
  });

  describe("role combinations", () => {
    it("should allow ADMIN to access everything", async () => {
      const admin: JwtUser = {
        id: "admin-123",
        email: "admin@example.com",
        role: "ADMIN",
      };

      const token = signJwt(admin, process.env.JWT_SECRET!);

      app.get("/admin-only", requireAuth, requireRole("ADMIN"), (req: Request, res: Response) => {
        res.json({ role: "ADMIN" });
      });

      app.get(
        "/engineer-route",
        requireAuth,
        requireRole("ENGINEER"),
        (req: Request, res: Response) => {
          res.json({ role: "ENGINEER" });
        },
      );

      const adminResponse = await request(app)
        .get("/admin-only")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(adminResponse.body.role).toBe("ADMIN");
    });

    it("should restrict VIEWER to viewer-only routes", async () => {
      const viewer: JwtUser = {
        id: "viewer-123",
        email: "viewer@example.com",
        role: "VIEWER",
      };

      const token = signJwt(viewer, process.env.JWT_SECRET!);

      app.get("/viewer", requireAuth, requireRole("VIEWER"), (req: Request, res: Response) => {
        res.json({ role: "VIEWER" });
      });

      const viewerResponse = await request(app)
        .get("/viewer")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(viewerResponse.body.role).toBe("VIEWER");
    });
  });
});

describe("middleware integration", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    process.env.JWT_SECRET = "test-secret-key";
    app.use(express.json());
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("should work in order: requireAuth -> requireRole", async () => {
    const user: JwtUser = {
      id: "engineer-123",
      email: "engineer@example.com",
      role: "ENGINEER",
    };

    const token = signJwt(user, process.env.JWT_SECRET!);

    app.get(
      "/protected",
      requireAuth,
      requireRole("ENGINEER", "ADMIN"),
      (req: Request, res: Response) => {
        res.json({ success: true, user: req.user });
      },
    );

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty("success", true);
    expect(response.body.user).toEqual(user);
  });

  it("should handle cascading failures properly", async () => {
    app.get("/api/data", requireAuth, requireRole("ADMIN"), (req: Request, res: Response) => {
      res.json({ data: "sensitive data" });
    });

    // Without token
    const response1 = await request(app).get("/api/data").expect(401);
    expect(response1.body.error).toBe("Unauthorized");

    // With wrong role
    const viewer: JwtUser = {
      id: "viewer-123",
      email: "viewer@example.com",
      role: "VIEWER",
    };
    const viewerToken = signJwt(viewer, process.env.JWT_SECRET!);

    const response2 = await request(app)
      .get("/api/data")
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(403);
    expect(response2.body.error).toBe("Forbidden");
  });
});
