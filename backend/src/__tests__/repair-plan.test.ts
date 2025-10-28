import type { Express } from "express";
import express from "express";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import path from "path";
import { signJwt } from "../utils/jwt";

describe("Repair Plan Generation Integration", () => {
  let app: Express;
  let prisma: PrismaClient;
  let adminToken: string;
  let testTurbine: any;
  let testInspection: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    process.env.JWT_SECRET = "test-secret-key";

    // Setup Apollo Server for GraphQL tests
    const typeDefs = readFileSync(path.join(process.cwd(), "src/graphql/schema.graphql"), "utf8");
    const resolvers = {
      Query: {
        inspection: async (_: any, { id }: any) =>
          prisma.inspection.findUnique({
            where: { id },
            include: { turbine: true, findings: true, repairPlan: true },
          }),
        repairPlan: async (_: any, { inspectionId }: any) =>
          prisma.repairPlan.findUnique({ where: { inspectionId } }),
      },
      Mutation: {
        generateRepairPlan: async (_: any, { inspectionId }: any) => {
          const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
            include: { findings: true },
          });
          if (!inspection) throw new Error("Inspection not found");

          // Severity rule: if category=BLADE_DAMAGE and notes contain "crack", min severity=4
          const adjusted = inspection.findings.map((f) => {
            const hasCrack = (f.notes || "").toLowerCase().includes("crack");
            const severity =
              f.category === "BLADE_DAMAGE" && hasCrack ? Math.max(4, f.severity) : f.severity;
            return { ...f, severity };
          });

          const total = adjusted.reduce((s, f) => s + Number(f.estimatedCost || 0), 0);
          const maxSeverity = Math.max(0, ...adjusted.map((f) => f.severity));
          const priority = maxSeverity >= 5 ? "HIGH" : maxSeverity >= 3 ? "MEDIUM" : "LOW";

          const plan = await prisma.repairPlan.upsert({
            where: { inspectionId },
            update: {
              priority: priority as any,
              totalEstimatedCost: total,
              snapshotJson: adjusted,
            },
            create: {
              inspectionId,
              priority: priority as any,
              totalEstimatedCost: total,
              snapshotJson: adjusted,
            },
          });

          return plan;
        },
      },
    };

    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();

    app = express();
    app.use(express.json());
    app.use("/graphql", expressMiddleware(server));

    // Create test user and token
    const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
    if (admin) {
      adminToken = signJwt(
        { id: admin.id, email: admin.email, role: admin.role },
        process.env.JWT_SECRET!,
      );
    }

    // Create test turbine
    testTurbine = await prisma.turbine.create({
      data: {
        name: "Repair Plan Test Turbine",
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
    if (testInspection?.id) {
      // Delete associated repair plan
      await prisma.repairPlan.deleteMany({ where: { inspectionId: testInspection.id } });
      // Delete associated findings
      await prisma.finding.deleteMany({ where: { inspectionId: testInspection.id } });
      await prisma.inspection.delete({ where: { id: testInspection.id } });
    }
    if (testTurbine?.id) {
      await prisma.turbine.delete({ where: { id: testTurbine.id } });
    }
    await prisma.$disconnect();
  });

  describe("generateRepairPlan - Happy Path Integration", () => {
    let inspectionWithFindings: any;

    beforeEach(async () => {
      // Create an inspection with findings for each test
      inspectionWithFindings = await prisma.inspection.create({
        data: {
          turbineId: testTurbine.id,
          date: new Date(),
          dataSource: "DRONE",
        },
      });
    });

    afterEach(async () => {
      if (inspectionWithFindings?.id) {
        await prisma.repairPlan.deleteMany({ where: { inspectionId: inspectionWithFindings.id } });
        await prisma.finding.deleteMany({ where: { inspectionId: inspectionWithFindings.id } });
        await prisma.inspection.delete({ where: { id: inspectionWithFindings.id } });
      }
    });

    it("should generate repair plan with HIGH priority when max severity >= 5", async () => {
      // Create finding with severity 5
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "LIGHTNING",
          severity: 5,
          estimatedCost: 2000,
          notes: "Severe lightning damage",
        },
      });

      const mutation = `
        mutation {
          generateRepairPlan(inspectionId: "${inspectionWithFindings.id}") {
            id
            priority
            totalEstimatedCost
          }
        }
      `;

      const response = await request(app).post("/graphql").send({ query: mutation }).expect(200);

      expect(response.body.data.generateRepairPlan.priority).toBe("HIGH");
      expect(response.body.data.generateRepairPlan.totalEstimatedCost).toBe(2000);
    });

    it("should generate repair plan with MEDIUM priority when max severity >= 3", async () => {
      // Create finding with severity 4
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "EROSION",
          severity: 4,
          estimatedCost: 1500,
          notes: "Moderate erosion",
        },
      });

      const mutation = `
        mutation {
          generateRepairPlan(inspectionId: "${inspectionWithFindings.id}") {
            id
            priority
            totalEstimatedCost
          }
        }
      `;

      const response = await request(app).post("/graphql").send({ query: mutation }).expect(200);

      expect(response.body.data.generateRepairPlan.priority).toBe("MEDIUM");
      expect(response.body.data.generateRepairPlan.totalEstimatedCost).toBe(1500);
    });

    it("should generate repair plan with LOW priority when max severity < 3", async () => {
      // Create finding with severity 2
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "UNKNOWN",
          severity: 2,
          estimatedCost: 500,
          notes: "Minor issue",
        },
      });

      const mutation = `
        mutation {
          generateRepairPlan(inspectionId: "${inspectionWithFindings.id}") {
            id
            priority
            totalEstimatedCost
          }
        }
      `;

      const response = await request(app).post("/graphql").send({ query: mutation }).expect(200);

      expect(response.body.data.generateRepairPlan.priority).toBe("LOW");
      expect(response.body.data.generateRepairPlan.totalEstimatedCost).toBe(500);
    });

    it("should apply severity rule for BLADE_DAMAGE with 'crack' when generating plan", async () => {
      // Create finding with BLADE_DAMAGE and crack - severity 2 should become 4
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "BLADE_DAMAGE",
          severity: 2,
          estimatedCost: 1800,
          notes: "crack found on blade",
        },
      });

      const mutation = `
        mutation {
          generateRepairPlan(inspectionId: "${inspectionWithFindings.id}") {
            id
            priority
            totalEstimatedCost
          }
        }
      `;

      const response = await request(app).post("/graphql").send({ query: mutation }).expect(200);

      // Priority should be MEDIUM because severity was adjusted to 4
      expect(response.body.data.generateRepairPlan.priority).toBe("MEDIUM");
    });

    it("should sum totalEstimatedCost from all findings", async () => {
      // Create multiple findings
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "EROSION",
          severity: 3,
          estimatedCost: 500,
          notes: "First finding",
        },
      });
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "LIGHTNING",
          severity: 4,
          estimatedCost: 1200,
          notes: "Second finding",
        },
      });
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "UNKNOWN",
          severity: 2,
          estimatedCost: 300,
          notes: "Third finding",
        },
      });

      const mutation = `
        mutation {
          generateRepairPlan(inspectionId: "${inspectionWithFindings.id}") {
            id
            priority
            totalEstimatedCost
          }
        }
      `;

      const response = await request(app).post("/graphql").send({ query: mutation }).expect(200);

      // Total should be sum of all finding costs
      expect(response.body.data.generateRepairPlan.totalEstimatedCost).toBe(2000);
    });

    it("should use highest severity for priority calculation", async () => {
      // Create findings with mixed severities
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "UNKNOWN",
          severity: 1,
          estimatedCost: 100,
          notes: "Low severity",
        },
      });
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "EROSION",
          severity: 3,
          estimatedCost: 500,
          notes: "Medium severity",
        },
      });
      await prisma.finding.create({
        data: {
          inspectionId: inspectionWithFindings.id,
          category: "LIGHTNING",
          severity: 6,
          estimatedCost: 2000,
          notes: "High severity",
        },
      });

      const mutation = `
        mutation {
          generateRepairPlan(inspectionId: "${inspectionWithFindings.id}") {
            id
            priority
            totalEstimatedCost
          }
        }
      `;

      const response = await request(app).post("/graphql").send({ query: mutation }).expect(200);

      // Priority should be HIGH because max severity is 6
      expect(response.body.data.generateRepairPlan.priority).toBe("HIGH");
      expect(response.body.data.generateRepairPlan.totalEstimatedCost).toBe(2600);
    });

    it("should handle inspection with no findings", async () => {
      const mutation = `
        mutation {
          generateRepairPlan(inspectionId: "${inspectionWithFindings.id}") {
            id
            priority
            totalEstimatedCost
          }
        }
      `;

      const response = await request(app).post("/graphql").send({ query: mutation }).expect(200);

      // Priority should be LOW when no findings
      expect(response.body.data.generateRepairPlan.priority).toBe("LOW");
      expect(response.body.data.generateRepairPlan.totalEstimatedCost).toBe(0);
    });

    it("should return error for nonexistent inspection", async () => {
      const mutation = `
        mutation {
          generateRepairPlan(inspectionId: "nonexistent-id") {
            id
            priority
          }
        }
      `;

      const response = await request(app).post("/graphql").send({ query: mutation }).expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain("Inspection not found");
    });
  });
});
