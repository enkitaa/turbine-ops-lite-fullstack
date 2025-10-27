import { PrismaClient, Role, DataSource, FindingCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // users
  const users = [
    { email: "admin@example.com", name: "Admin", role: "ADMIN", password: "admin123" },
    { email: "eng@example.com", name: "Engineer", role: "ENGINEER", password: "engineer123" },
    { email: "viewer@example.com", name: "Viewer", role: "VIEWER", password: "viewer123" },
  ] as const;

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, role: u.role as Role, name: u.name },
      create: { email: u.email, passwordHash: hash, role: u.role as Role, name: u.name },
    });
  }

  // sample turbines
  const t1 = await prisma.turbine.upsert({
    where: { id: "seed-turbine-1" },
    update: {},
    create: {
      id: "seed-turbine-1",
      name: "T-1000",
      manufacturer: "SkyGen",
      mwRating: 2.5,
      lat: 12.98,
      lng: 77.59,
    },
  });

  const t2 = await prisma.turbine.upsert({
    where: { id: "seed-turbine-2" },
    update: {},
    create: {
      id: "seed-turbine-2",
      name: "T-2000",
      manufacturer: "WindTech",
      mwRating: 3.5,
      lat: 13.0,
      lng: 77.6,
    },
  });

  const t3 = await prisma.turbine.upsert({
    where: { id: "seed-turbine-3" },
    update: {},
    create: {
      id: "seed-turbine-3",
      name: "T-3000",
      manufacturer: "PowerWind",
      mwRating: 4.0,
      lat: 12.95,
      lng: 77.55,
    },
  });

  // sample inspections
  const inspection1 = await prisma.inspection.upsert({
    where: { id: "seed-inspection-1" },
    update: {},
    create: {
      id: "seed-inspection-1",
      turbineId: t1.id,
      date: new Date("2024-01-15"),
      inspectorName: "John Smith",
      dataSource: DataSource.DRONE,
      rawPackageUrl: "https://example.com/inspection1.zip",
    },
  });

  const inspection2 = await prisma.inspection.upsert({
    where: { id: "seed-inspection-2" },
    update: {},
    create: {
      id: "seed-inspection-2",
      turbineId: t1.id,
      date: new Date("2024-02-20"),
      inspectorName: "Jane Doe",
      dataSource: DataSource.MANUAL,
    },
  });

  // sample findings
  await prisma.finding.upsert({
    where: { id: "seed-finding-1" },
    update: {},
    create: {
      id: "seed-finding-1",
      inspectionId: inspection1.id,
      category: FindingCategory.BLADE_DAMAGE,
      severity: 3,
      estimatedCost: 5000,
      notes: "Minor crack on blade tip",
    },
  });

  await prisma.finding.upsert({
    where: { id: "seed-finding-2" },
    update: {},
    create: {
      id: "seed-finding-2",
      inspectionId: inspection1.id,
      category: FindingCategory.LIGHTNING,
      severity: 7,
      estimatedCost: 15000,
      notes: "Lightning strike damage to surface",
    },
  });

  await prisma.finding.upsert({
    where: { id: "seed-finding-3" },
    update: {},
    create: {
      id: "seed-finding-3",
      inspectionId: inspection2.id,
      category: FindingCategory.EROSION,
      severity: 2,
      estimatedCost: 2500,
      notes: "Minor erosion on leading edge",
    },
  });

  await prisma.finding.upsert({
    where: { id: "seed-finding-4" },
    update: {},
    create: {
      id: "seed-finding-4",
      inspectionId: inspection2.id,
      category: FindingCategory.BLADE_DAMAGE,
      severity: 6,
      estimatedCost: 18000,
      notes: "Crack on main blade - needs immediate attention",
    },
  });

  console.log("Seeded:", {
    users: users.length,
    turbines: [t1.name, t2.name, t3.name],
    inspections: [inspection1.id, inspection2.id],
  });
}

main().finally(() => prisma.$disconnect());
