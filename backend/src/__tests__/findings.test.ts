import type { Express } from "express";
import express from "express";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import {
  getFindingsHandler,
  createFindingHandler,
  updateFindingHandler,
  deleteFindingHandler,
} from "../routes/findings";
import { signJwt } from "../utils/jwt";

describe("Finding CRUD Operations & Severity Derivation", () => {
  let app: Express;
  let prisma: PrismaClient;
  let adminToken: string;
  let engineerToken: string;
  let testTurbine: any;
  let testInspection: any;
  let testFinding: any;

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
        name: "Test Finding Turbine",
        manufacturer: "Test Manufacturer",
        mwRating: 2.5,
      },
    });

    // Create test inspection
    testInspection = await prisma.inspection.create({
      data: {
        turbineId: testTurbine.id,
        date: new Date("2024-01-15"),
        dataSource: "DRONE",
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    // Delete test finding
    if (testFinding?.id) {
      await prisma.finding.delete({ where: { id: testFinding.id } }).catch(() => {});
    }

    // Delete test inspection
    if (testInspection?.id) {
      await prisma.inspection.delete({ where: { id: testInspection.id } }).catch(() => {});
    }

    // Delete test turbine
    if (testTurbine?.id) {
      await prisma.turbine.delete({ where: { id: testTurbine.id } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  describe("GET /api/findings", () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.get("/findings", getFindingsHandler);
    });

    it("should return all findings for an inspection", async () => {
      // Create a test finding first
      testFinding = await prisma.finding.create({
        data: {
          inspectionId: testInspection.id,
          category: "BLADE_DAMAGE",
          severity: 5,
          estimatedCost: 1000,
          notes: "Minor damage",
        },
      });

      const response = await request(app)
        .get("/findings")
        .query({ inspectionId: testInspection.id })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("category");
      expect(response.body[0]).toHaveProperty("severity");
    });

    it("should return 400 when inspectionId is missing", async () => {
      const response = await request(app)
        .get("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body.message).toContain("inspectionId");
    });
  });

  describe("POST /api/findings - Severity Derivation", () => {
    let findingTestInspection: any;

    beforeEach(async () => {
      findingTestInspection = await prisma.inspection.create({
        data: {
          turbineId: testTurbine.id,
          date: new Date("2024-02-01"),
          dataSource: "DRONE",
        },
      });

      app = express();
      app.use(express.json());
      app.post("/findings", createFindingHandler);
    });

    afterEach(async () => {
      if (findingTestInspection?.id) {
        await prisma.finding.deleteMany({ where: { inspectionId: findingTestInspection.id } });
        await prisma.inspection.delete({ where: { id: findingTestInspection.id } });
      }
    });

    it("should create a finding with valid data", async () => {
      const newFinding = {
        inspectionId: findingTestInspection.id,
        category: "EROSION",
        severity: 3,
        estimatedCost: 500,
        notes: "Minor erosion",
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newFinding)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.category).toBe(newFinding.category);
      expect(response.body.severity).toBe(3);

      // Cleanup
      await prisma.finding.delete({ where: { id: response.body.id } });
    });

    it("should apply severity rule for BLADE_DAMAGE with 'crack' in notes", async () => {
      const findingWithCrack = {
        inspectionId: findingTestInspection.id,
        category: "BLADE_DAMAGE",
        severity: 2, // Initial severity is 2
        estimatedCost: 1500,
        notes: "Small crack found on blade",
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(findingWithCrack)
        .expect(201);

      // Severity should be adjusted to at least 4 due to the rule
      expect(response.body.severity).toBe(4);

      // Cleanup
      await prisma.finding.delete({ where: { id: response.body.id } });
    });

    it("should apply severity rule for BLADE_DAMAGE with 'Crack' (capitalized) in notes", async () => {
      const findingWithCrack = {
        inspectionId: findingTestInspection.id,
        category: "BLADE_DAMAGE",
        severity: 1,
        estimatedCost: 2000,
        notes: "Major Crack detected",
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(findingWithCrack)
        .expect(201);

      // Should still trigger the rule due to case-insensitive matching
      expect(response.body.severity).toBe(4);

      // Cleanup
      await prisma.finding.delete({ where: { id: response.body.id } });
    });

    it("should NOT apply severity rule for other categories with 'crack'", async () => {
      const findingWithCrack = {
        inspectionId: findingTestInspection.id,
        category: "LIGHTNING",
        severity: 2,
        estimatedCost: 800,
        notes: "crack in material",
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(findingWithCrack)
        .expect(201);

      // Should NOT apply the rule for non-BLADE_DAMAGE categories
      expect(response.body.severity).toBe(2);

      // Cleanup
      await prisma.finding.delete({ where: { id: response.body.id } });
    });

    it("should NOT apply severity rule for BLADE_DAMAGE without 'crack'", async () => {
      const findingWithoutCrack = {
        inspectionId: findingTestInspection.id,
        category: "BLADE_DAMAGE",
        severity: 2,
        estimatedCost: 1000,
        notes: "Minor damage, no repairs needed",
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(findingWithoutCrack)
        .expect(201);

      // Should keep original severity (no crack keyword)
      expect(response.body.severity).toBe(2);

      // Cleanup
      await prisma.finding.delete({ where: { id: response.body.id } });
    });

    it("should keep severity above 4 when already high", async () => {
      const findingWithCrack = {
        inspectionId: findingTestInspection.id,
        category: "BLADE_DAMAGE",
        severity: 7, // Already above 4
        estimatedCost: 3000,
        notes: "severe crack damage",
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(findingWithCrack)
        .expect(201);

      // Should keep the higher severity
      expect(response.body.severity).toBe(7);

      // Cleanup
      await prisma.finding.delete({ where: { id: response.body.id } });
    });

    it("should return 400 when severity is out of range", async () => {
      const invalidFinding = {
        inspectionId: findingTestInspection.id,
        category: "EROSION",
        severity: 15, // Out of range
        estimatedCost: 500,
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidFinding)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body.message).toContain("Severity must be between 1 and 10");
    });

    it("should return 400 when estimatedCost is negative", async () => {
      const invalidFinding = {
        inspectionId: findingTestInspection.id,
        category: "EROSION",
        severity: 3,
        estimatedCost: -100,
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidFinding)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Bad Request");
      expect(response.body.message).toContain("Estimated cost must be non-negative");
    });

    it("should return 404 when inspection does not exist", async () => {
      const newFinding = {
        inspectionId: "nonexistent-inspection-id",
        category: "EROSION",
        severity: 3,
        estimatedCost: 500,
      };

      const response = await request(app)
        .post("/findings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newFinding)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });
  });

  describe("PUT /api/findings/:id - Update with Severity Derivation", () => {
    let updateTestFinding: any;

    beforeEach(async () => {
      const updateTestInspection = await prisma.inspection.create({
        data: {
          turbineId: testTurbine.id,
          date: new Date("2024-03-01"),
          dataSource: "DRONE",
        },
      });

      updateTestFinding = await prisma.finding.create({
        data: {
          inspectionId: updateTestInspection.id,
          category: "EROSION",
          severity: 3,
          estimatedCost: 500,
          notes: "Minor erosion",
        },
      });

      app = express();
      app.use(express.json());
      app.put("/findings/:id", updateFindingHandler);
    });

    afterEach(async () => {
      if (updateTestFinding?.id) {
        const inspectionId = (
          await prisma.finding.findUnique({ where: { id: updateTestFinding.id } })
        )?.inspectionId;
        await prisma.finding.delete({ where: { id: updateTestFinding.id } }).catch(() => {});
        if (inspectionId) {
          await prisma.inspection.delete({ where: { id: inspectionId } }).catch(() => {});
        }
      }
    });

    it("should update a finding with valid data", async () => {
      const updateData = {
        notes: "Updated notes",
        estimatedCost: 600,
      };

      const response = await request(app)
        .put(`/findings/${updateTestFinding.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.notes).toBe(updateData.notes);
      expect(response.body.estimatedCost).toBe(updateData.estimatedCost);
    });

    it("should apply severity rule when updating category to BLADE_DAMAGE with 'crack'", async () => {
      const updateData = {
        category: "BLADE_DAMAGE",
        notes: "crack found",
        severity: 2,
      };

      const response = await request(app)
        .put(`/findings/${updateTestFinding.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      // Severity should be adjusted to 4
      expect(response.body.severity).toBe(4);
      expect(response.body.category).toBe("BLADE_DAMAGE");
    });

    it("should apply severity rule when updating notes to include 'crack'", async () => {
      // First update to BLADE_DAMAGE with low severity
      await prisma.finding.update({
        where: { id: updateTestFinding.id },
        data: { category: "BLADE_DAMAGE", severity: 2 },
      });

      // Update notes to include 'crack' AND provide severity
      const updateData = {
        notes: "crack in blade",
        severity: 2, // Severity needs to be included for the rule to apply
      };

      const response = await request(app)
        .put(`/findings/${updateTestFinding.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      // Severity should be adjusted to 4
      expect(response.body.severity).toBe(4);
    });

    it("should return 404 when finding not found", async () => {
      const response = await request(app)
        .put("/findings/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ notes: "Updated" })
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });
  });

  describe("DELETE /api/findings/:id", () => {
    let deleteTestFinding: any;

    beforeEach(async () => {
      const deleteTestInspection = await prisma.inspection.create({
        data: {
          turbineId: testTurbine.id,
          date: new Date("2024-04-01"),
          dataSource: "MANUAL",
        },
      });

      deleteTestFinding = await prisma.finding.create({
        data: {
          inspectionId: deleteTestInspection.id,
          category: "UNKNOWN",
          severity: 1,
          estimatedCost: 100,
        },
      });

      app = express();
      app.use(express.json());
      app.delete("/findings/:id", deleteFindingHandler);
    });

    afterEach(async () => {
      if (deleteTestFinding?.id) {
        await prisma.finding.delete({ where: { id: deleteTestFinding.id } }).catch(() => {});
      }
    });

    it("should delete a finding successfully", async () => {
      const findingId = deleteTestFinding.id;

      await request(app)
        .delete(`/findings/${findingId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);

      const deleted = await prisma.finding.findUnique({ where: { id: findingId } });
      expect(deleted).toBeNull();
    });

    it("should return 404 when finding not found", async () => {
      const response = await request(app)
        .delete("/findings/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
    });
  });
});
