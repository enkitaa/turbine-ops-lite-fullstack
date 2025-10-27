import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateInspectionRequest {
  turbineId: string;
  date: string;
  inspectorName?: string;
  dataSource: "DRONE" | "MANUAL";
  rawPackageUrl?: string;
}

interface UpdateInspectionRequest {
  date?: string;
  inspectorName?: string;
  dataSource?: "DRONE" | "MANUAL";
  rawPackageUrl?: string;
}

interface FindInspectionQuery {
  turbineId?: string;
  startDate?: string;
  endDate?: string;
  dataSource?: string;
  searchNotes?: string;
}

// GET /api/inspections - List inspections with filters
export const getInspectionsHandler = async (
  req: Request<{}, {}, {}, FindInspectionQuery>,
  res: Response,
) => {
  try {
    const { turbineId, startDate, endDate, dataSource, searchNotes } = req.query;

    const where: any = {};

    if (turbineId) where.turbineId = turbineId;
    if (dataSource) where.dataSource = dataSource;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (searchNotes) {
      where.findings = {
        some: {
          notes: {
            contains: searchNotes,
            mode: "insensitive",
          },
        },
      };
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        turbine: true,
        findings: true,
        repairPlan: true,
      },
      orderBy: { date: "desc" },
    });

    return res.status(200).json(inspections);
  } catch (error) {
    throw error;
  }
};

// GET /api/inspections/:id - Get single inspection
export const getInspectionHandler = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        turbine: true,
        findings: true,
        repairPlan: true,
      },
    });

    if (!inspection) {
      return res.status(404).json({
        error: "Not Found",
        message: `Inspection with id ${id} not found`,
      });
    }

    return res.status(200).json(inspection);
  } catch (error) {
    throw error;
  }
};

// POST /api/inspections - Create inspection
export const createInspectionHandler = async (
  req: Request<{}, {}, CreateInspectionRequest>,
  res: Response,
) => {
  try {
    const { turbineId, date, inspectorName, dataSource, rawPackageUrl } = req.body;

    // Validate required fields
    if (!turbineId || !date || !dataSource) {
      return res.status(400).json({
        error: "Bad Request",
        message: "turbineId, date, and dataSource are required",
      });
    }

    // Check if turbine exists
    const turbine = await prisma.turbine.findUnique({ where: { id: turbineId } });
    if (!turbine) {
      return res.status(404).json({
        error: "Not Found",
        message: `Turbine with id ${turbineId} not found`,
      });
    }

    // Prevent overlapping inspections on same turbine/date
    const existing = await prisma.inspection.findFirst({
      where: {
        turbineId,
        date: new Date(date),
      },
    });

    if (existing) {
      return res.status(409).json({
        error: "Conflict",
        message: "Inspection already exists for this turbine on this date",
      });
    }

    const inspection = await prisma.inspection.create({
      data: {
        turbineId,
        date: new Date(date),
        inspectorName,
        dataSource,
        rawPackageUrl,
      },
      include: {
        turbine: true,
        findings: true,
      },
    });

    return res.status(201).json(inspection);
  } catch (error) {
    throw error;
  }
};

// PUT /api/inspections/:id - Update inspection
export const updateInspectionHandler = async (
  req: Request<{ id: string }, {}, UpdateInspectionRequest>,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { date, inspectorName, dataSource, rawPackageUrl } = req.body;

    const existing = await prisma.inspection.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        error: "Not Found",
        message: `Inspection with id ${id} not found`,
      });
    }

    // If updating date, check for conflicts
    if (date && date !== existing.date.toISOString()) {
      const conflict = await prisma.inspection.findFirst({
        where: {
          turbineId: existing.turbineId,
          date: new Date(date),
          NOT: { id },
        },
      });

      if (conflict) {
        return res.status(409).json({
          error: "Conflict",
          message: "Another inspection exists for this turbine on the new date",
        });
      }
    }

    const updateData: any = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (inspectorName !== undefined) updateData.inspectorName = inspectorName;
    if (dataSource !== undefined) updateData.dataSource = dataSource;
    if (rawPackageUrl !== undefined) updateData.rawPackageUrl = rawPackageUrl;

    const inspection = await prisma.inspection.update({
      where: { id },
      data: updateData,
      include: {
        turbine: true,
        findings: true,
        repairPlan: true,
      },
    });

    return res.status(200).json(inspection);
  } catch (error) {
    throw error;
  }
};

// DELETE /api/inspections/:id - Delete inspection
export const deleteInspectionHandler = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.inspection.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        error: "Not Found",
        message: `Inspection with id ${id} not found`,
      });
    }

    // Delete inspection
    await prisma.inspection.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    throw error;
  }
};
