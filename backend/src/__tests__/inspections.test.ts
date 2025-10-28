import type { Express } from "express";
import express from "express";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import {
  getInspectionsHandler,
  getInspectionHandler,
  createInspectionHandler,
  updateInspectionHandler,
  deleteInspectionHandler,
} from "../routes/inspections";
import { signJwt } from "../utils/jwt";

describe("Inspection CRUD Operations & Overlap Prevention", () => {
  let app: Express;
  let prisma: PrismaClient;
  let adminToken: string;
  let engineerToken: string;
  let testTurbine: any;
  let testInspection: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    process.env.JWT_SECRET = "test-secret-key";

    // Create test users and tokens
    const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
    const engineer = await prisma.user.findUnique({ where: { email: "eng@example.com" } });

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

    // Create test turbine
    testTurbine = await prisma.turbine.create({
      data: {
        name: "Test Inspection Turbine",
        manufacturer: "Test Manufacturer",
        mwRating: 2.5,
        lat: 12.98,
        lng: 77.59,
      },
    });

    // Create a test inspection
    testInspection = await prisma.inspection.create({
      data: {
        turbineId: testTurbine.id,
        date: new Date("2024-01-15"),
        inspectorName: "John Doe",
        dataSource: "DRONE",
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    // Delete test inspection
    if (testInspection?.id) {
      await prisma.inspection.delete({ where: { id: testInspection.id } }).catch(() => {});
    }

    // Delete any remaining test inspections for the turbine
    await prisma.inspection.deleteMany({ where: { turbineId: testTurbine.id } });

    // Delete test turbine
    if (testTurbine?.id) {
      await prisma.turbine.delete({ where: { id: testTurbine.id } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  describe("GET /api/inspections", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.get("/inspections", getInspectionsHandler);
    });

    it("should return all inspections", async () => {
      const response = await request(app)
        .get("/inspections")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("date");
      expect(response.body[0]).toHaveProperty("dataSource");
    });

    it("should filter inspections by turbineId", async () => {
      const response = await request(app)
        .get("/inspections")
        .query({ turbineId: testTurbine.id })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((inspection: any) => {
        expect(inspection.turbineId).toBe(testTurbine.id);
      });
    });

    it("should filter inspections by dataSource", async () => {
      const response = await request(app)
        .get("/inspections")
        .query({ dataSource: "DRONE" })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((inspection: any) => {
        expect(inspection.dataSource).toBe("DRONE");
      });
    });
  });

  describe("GET /api/inspections/:id", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.get("/inspections/:id", getInspectionHandler);
    });

    it("should return a single inspection", async () => {
      const response = await request(app)
        .get(`/inspections/${testInspection.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(testInspection.id);
      expect(response.body).toHaveProperty("turbine");
      expect(response.body).toHaveProperty("findings");
    });

    it("should return 404 when inspection not found", async () => {
      const response = await request(app)
        .get("/inspections/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });
  });

  describe("POST /api/inspections - Overlap Prevention", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post("/inspections", createInspectionHandler);
    });

    it("should create a new inspection with valid data", async () => {
      const newInspection = {
        turbineId: testTurbine.id,
        date: "2024-01-20T00:00:00Z",
        inspectorName: "Jane Smith",
        dataSource: "MANUAL",
      };

      const response = await request(app)
        .post("/inspections")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newInspection)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.turbineId).toBe(newInspection.turbineId);
      expect(response.body.dataSource).toBe(newInspection.dataSource);

      // Cleanup
      await prisma.inspection.delete({ where: { id: response.body.id } });
    });

    it("should prevent overlapping inspections on same turbine/date", async () => {
      // Try to create an inspection with the same date as testInspection
      const overlappingInspection = {
        turbineId: testTurbine.id,
        date: new Date("2024-01-15").toISOString(),
        inspectorName: "Another Inspector",
        dataSource: "MANUAL",
      };

      const response = await request(app)
        .post("/inspections")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(overlappingInspection)
        .expect(409);

      expect(response.body).toHaveProperty("error", "Conflict");
      expect(response.body.message).toContain(
        "Inspection already exists for this turbine on this date",
      );
    });

    it("should allow inspections on same date for different turbines", async () => {
      // Create a second turbine
      const secondTurbine = await prisma.turbine.create({
        data: {
          name: "Second Test Turbine",
          manufacturer: "Test Manufacturer",
          mwRating: 3.0,
        },
      });

      const sameDateInspection = {
        turbineId: secondTurbine.id,
        date: new Date("2024-01-15").toISOString(),
        inspectorName: "Test Inspector",
        dataSource: "DRONE",
      };

      const response = await request(app)
        .post("/inspections")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(sameDateInspection)
        .expect(201);

      expect(response.body.id).toBeDefined();

      // Cleanup
      await prisma.inspection.delete({ where: { id: response.body.id } });
      await prisma.turbine.delete({ where: { id: secondTurbine.id } });
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await request(app)
        .post("/inspections")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ inspectorName: "Test" })
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body.message).toContain("required");
    });

    it("should return 404 when turbine does not exist", async () => {
      const newInspection = {
        turbineId: "nonexistent-turbine-id",
        date: "2024-01-25T00:00:00Z",
        dataSource: "DRONE",
      };

      const response = await request(app)
        .post("/inspections")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newInspection)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });
  });

  describe("PUT /api/inspections/:id - Update with Overlap Prevention", () => {
    let updateTestInspection: any;

    beforeEach(async () => {
      updateTestInspection = await prisma.inspection.create({
        data: {
          turbineId: testTurbine.id,
          date: new Date("2024-02-01"),
          inspectorName: "Update Test Inspector",
          dataSource: "DRONE",
        },
      });

      app = express();
      app.use(express.json());
      app.put("/inspections/:id", updateInspectionHandler);
    });

    afterEach(async () => {
      if (updateTestInspection?.id) {
        await prisma.inspection.delete({ where: { id: updateTestInspection.id } }).catch(() => {});
      }
    });

    it("should update an inspection with valid data", async () => {
      const updateData = {
        inspectorName: "Updated Inspector Name",
        dataSource: "MANUAL",
      };

      const response = await request(app)
        .put(`/inspections/${updateTestInspection.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.inspectorName).toBe(updateData.inspectorName);
      expect(response.body.dataSource).toBe(updateData.dataSource);
    });

    it("should prevent overlapping inspections when updating date", async () => {
      // Try to update the date to conflict with testInspection
      const updateData = {
        date: new Date("2024-01-15").toISOString(),
      };

      const response = await request(app)
        .put(`/inspections/${updateTestInspection.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body).toHaveProperty("error", "Conflict");
      expect(response.body.message).toContain(
        "Another inspection exists for this turbine on the new date",
      );
    });

    it("should allow updating date to non-conflicting date", async () => {
      const updateData = {
        date: new Date("2024-02-15").toISOString(),
      };

      const response = await request(app)
        .put(`/inspections/${updateTestInspection.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(new Date(response.body.date).toISOString()).toBe(updateData.date);
    });

    it("should return 404 when inspection not found", async () => {
      const response = await request(app)
        .put("/inspections/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ inspectorName: "Updated" })
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });
  });

  describe("DELETE /api/inspections/:id", () => {
    let deleteTestInspection: any;

    beforeEach(async () => {
      deleteTestInspection = await prisma.inspection.create({
        data: {
          turbineId: testTurbine.id,
          date: new Date("2024-03-01"),
          inspectorName: "Delete Test Inspector",
          dataSource: "MANUAL",
        },
      });

      app = express();
      app.use(express.json());
      app.delete("/inspections/:id", deleteInspectionHandler);
    });

    it("should delete an inspection successfully", async () => {
      await request(app)
        .delete(`/inspections/${deleteTestInspection.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);

      const deleted = await prisma.inspection.findUnique({
        where: { id: deleteTestInspection.id },
      });
      expect(deleted).toBeNull();
    });

    it("should return 404 when inspection not found", async () => {
      const response = await request(app)
        .delete("/inspections/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });
  });
});
