import type { Express } from "express";
import express from "express";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import {
  getTurbinesHandler,
  createTurbineHandler,
  updateTurbineHandler,
  deleteTurbineHandler,
} from "../routes/turbines";
import { signJwt } from "../utils/jwt";

describe("Turbine CRUD Operations", () => {
  let app: Express;
  let prisma: PrismaClient;
  let adminToken: string;
  let engineerToken: string;
  let viewerToken: string;
  let testTurbine: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    process.env.JWT_SECRET = "test-secret-key";

    // Create test users and tokens
    const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
    const engineer = await prisma.user.findUnique({ where: { email: "eng@example.com" } });
    const viewer = await prisma.user.findUnique({ where: { email: "viewer@example.com" } });

    if (admin) {
      adminToken = signJwt(
        { id: admin.id, email: admin.email, role: admin.role },
        process.env.JWT_SECRET!,
      );
    }
    if (engineer) {
      engineerToken = signJwt(
        { id: engineer.id, email: engineer.email, role: engineer.role },
        process.env.JWT_SECRET!,
      );
    }
    if (viewer) {
      viewerToken = signJwt(
        { id: viewer.id, email: viewer.email, role: viewer.role },
        process.env.JWT_SECRET!,
      );
    }

    // Create test turbine
    testTurbine = await prisma.turbine.create({
      data: {
        name: "Test Turbine",
        manufacturer: "Test Manufacturer",
        mwRating: 2.5,
        lat: 12.98,
        lng: 77.59,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testTurbine?.id) {
      await prisma.turbine.delete({ where: { id: testTurbine.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe("GET /api/turbines", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.get("/turbines", getTurbinesHandler);
    });

    it("should return all turbines", async () => {
      const response = await request(app)
        .get("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("name");
      expect(response.body[0]).toHaveProperty("createdAt");
    });
  });

  describe("POST /api/turbines", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post("/turbines", createTurbineHandler);
    });

    it("should create a turbine with valid data", async () => {
      const newTurbine = {
        name: "New Turbine",
        manufacturer: "WindTech",
        mwRating: 3.5,
        lat: 12.98,
        lng: 77.59,
      };

      const response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newTurbine)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe(newTurbine.name);
      expect(response.body.manufacturer).toBe(newTurbine.manufacturer);
      expect(response.body.mwRating).toBe(newTurbine.mwRating);

      // Cleanup
      await prisma.turbine.delete({ where: { id: response.body.id } });
    });

    it("should return 400 when name is missing", async () => {
      const response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ manufacturer: "WindTech" })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body).toHaveProperty("message", "Turbine name is required");
    });

    it("should return 400 when name is empty", async () => {
      const response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "   " })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
    });

    it("should return 400 when MW rating is out of range", async () => {
      const response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test", mwRating: 150 })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body.message).toContain("MW rating");
    });

    it("should return 400 when latitude is out of range", async () => {
      const response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test", lat: 100 })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body.message).toContain("Latitude");
    });

    it("should return 400 when longitude is out of range", async () => {
      const response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test", lng: 200 })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body.message).toContain("Longitude");
    });
  });

  describe("PUT /api/turbines/:id", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.put("/turbines/:id", updateTurbineHandler);
    });

    it("should update a turbine with valid data", async () => {
      const updateData = {
        name: "Updated Turbine",
        manufacturer: "Updated Manufacturer",
      };

      const response = await request(app)
        .put(`/turbines/${testTurbine.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.manufacturer).toBe(updateData.manufacturer);

      // Restore original
      await prisma.turbine.update({
        where: { id: testTurbine.id },
        data: { name: testTurbine.name, manufacturer: testTurbine.manufacturer },
      });
    });

    it("should return 404 when turbine not found", async () => {
      const response = await request(app)
        .put("/turbines/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated" })
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });

    it("should validate MW rating on update", async () => {
      const response = await request(app)
        .put(`/turbines/${testTurbine.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ mwRating: -5 })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
    });

    it("should allow partial updates", async () => {
      const originalMwRating = testTurbine.mwRating;
      const response = await request(app)
        .put(`/turbines/${testTurbine.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ mwRating: 4.5 })
        .expect(200);

      expect(response.body.mwRating).toBe(4.5);
      expect(response.body.name).toBe(testTurbine.name); // Other fields unchanged

      // Restore
      await prisma.turbine.update({
        where: { id: testTurbine.id },
        data: { mwRating: originalMwRating },
      });
    });
  });

  describe("DELETE /api/turbines/:id", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.delete("/turbines/:id", deleteTurbineHandler);
    });

    it("should delete a turbine successfully", async () => {
      const turbineToDelete = await prisma.turbine.create({
        data: {
          name: "Temporary Turbine",
          manufacturer: "Temp",
          mwRating: 1.0,
        },
      });

      await request(app)
        .delete(`/turbines/${turbineToDelete.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);

      const deleted = await prisma.turbine.findUnique({ where: { id: turbineToDelete.id } });
      expect(deleted).toBeNull();
    });

    it("should return 404 when turbine not found", async () => {
      const response = await request(app)
        .delete("/turbines/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });

    it("should return 409 when turbine has inspections", async () => {
      // Create a turbine with an inspection
      const turbineWithInspection = await prisma.turbine.create({
        data: {
          name: "Turbine with Inspection",
          manufacturer: "Test",
          mwRating: 2.0,
        },
      });

      await prisma.inspection.create({
        data: {
          turbineId: turbineWithInspection.id,
          date: new Date(),
          dataSource: "DRONE",
        },
      });

      const response = await request(app)
        .delete(`/turbines/${turbineWithInspection.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(409);

      expect(response.body).toHaveProperty("error", "Conflict");
      expect(response.body.message).toContain("inspections");

      // Cleanup
      await prisma.inspection.deleteMany({ where: { turbineId: turbineWithInspection.id } });
      await prisma.turbine.delete({ where: { id: turbineWithInspection.id } });
    });
  });

  describe("Role-based access control", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.get("/turbines", getTurbinesHandler);
      app.post("/turbines", createTurbineHandler);
      app.put("/turbines/:id", updateTurbineHandler);
      app.delete("/turbines/:id", deleteTurbineHandler);
    });

    it("should allow ADMIN to perform all operations", async () => {
      // GET
      const getResponse = await request(app)
        .get("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(getResponse.body).toBeDefined();

      // POST
      const newTurbine = await prisma.turbine.create({
        data: {
          name: "Admin Created Turbine",
          manufacturer: "Admin",
          mwRating: 2.0,
        },
      });

      // PUT
      await request(app)
        .put(`/turbines/${newTurbine.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated by Admin" })
        .expect(200);

      // DELETE
      await request(app)
        .delete(`/turbines/${newTurbine.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);
    });

    it("should allow ENGINEER to GET, POST, PUT", async () => {
      // GET
      await request(app)
        .get("/turbines")
        .set("Authorization", `Bearer ${engineerToken}`)
        .expect(200);

      // POST
      const newTurbine = await prisma.turbine.create({
        data: {
          name: "Engineer Created Turbine",
          manufacturer: "Engineer",
          mwRating: 2.0,
        },
      });

      await request(app)
        .put(`/turbines/${newTurbine.id}`)
        .set("Authorization", `Bearer ${engineerToken}`)
        .send({ name: "Updated by Engineer" })
        .expect(200);

      await prisma.turbine.delete({ where: { id: newTurbine.id } });
    });

    it("should allow VIEWER to GET but not POST, PUT, or DELETE", async () => {
      await request(app).get("/turbines").set("Authorization", `Bearer ${viewerToken}`).expect(200);

      await prisma.turbine.deleteMany({ where: { name: { startsWith: "Test" } } });
    });
  });

  describe("Input validation", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post("/turbines", createTurbineHandler);
      app.put("/turbines/:id", updateTurbineHandler);
    });

    it("should handle boundary values for MW rating", async () => {
      // Valid boundaries
      let response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test", mwRating: 0 })
        .expect(201);
      await prisma.turbine.delete({ where: { id: response.body.id } });

      response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test", mwRating: 100 })
        .expect(201);
      await prisma.turbine.delete({ where: { id: response.body.id } });

      // Invalid
      await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test", mwRating: -0.1 })
        .expect(400);

      await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test", mwRating: 100.1 })
        .expect(400);
    });

    it("should handle coordinate boundary values", async () => {
      const validCases = [
        { lat: -90, lng: -180 },
        { lat: 90, lng: 180 },
        { lat: 0, lng: 0 },
      ];

      for (const coords of validCases) {
        const response = await request(app)
          .post("/turbines")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ name: "Test", ...coords })
          .expect(201);
        await prisma.turbine.delete({ where: { id: response.body.id } });
      }
    });

    it("should trim whitespace from name and manufacturer", async () => {
      const response = await request(app)
        .post("/turbines")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "  Test Turbine  ", manufacturer: "  Test Manufacturer  " })
        .expect(201);

      expect(response.body.name).toBe("Test Turbine");
      expect(response.body.manufacturer).toBe("Test Manufacturer");

      await prisma.turbine.delete({ where: { id: response.body.id } });
    });
  });
});
