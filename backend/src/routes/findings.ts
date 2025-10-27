import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateFindingRequest {
  inspectionId: string;
  category: "BLADE_DAMAGE" | "LIGHTNING" | "EROSION" | "UNKNOWN";
  severity: number;
  estimatedCost: number;
  notes?: string;
}

interface UpdateFindingRequest {
  category?: "BLADE_DAMAGE" | "LIGHTNING" | "EROSION" | "UNKNOWN";
  severity?: number;
  estimatedCost?: number;
  notes?: string;
}

// Helper to apply BLADE_DAMAGE + crack rule
const applySeverityRule = (
  category: string,
  notes: string | null | undefined,
  severity: number,
): number => {
  if (category === "BLADE_DAMAGE" && notes?.toLowerCase().includes("crack")) {
    return Math.max(4, severity);
  }
  return severity;
};

// GET /api/findings - List all findings for an inspection
export const getFindingsHandler = async (
  req: Request<{}, {}, {}, { inspectionId: string }>,
  res: Response,
) => {
  try {
    const { inspectionId } = req.query;

    if (!inspectionId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "inspectionId query parameter is required",
      });
    }

    const findings = await prisma.finding.findMany({
      where: { inspectionId },
      include: { inspection: { include: { turbine: true } } },
      orderBy: { severity: "desc" },
    });

    return res.status(200).json(findings);
  } catch (error) {
    throw error;
  }
};

// POST /api/findings - Create a finding
export const createFindingHandler = async (
  req: Request<{}, {}, CreateFindingRequest>,
  res: Response,
) => {
  try {
    const { inspectionId, category, severity, estimatedCost, notes } = req.body;

    // Validate required fields
    if (!inspectionId || !category || severity === undefined || estimatedCost === undefined) {
      return res.status(400).json({
        error: "Bad Request",
        message: "inspectionId, category, severity, and estimatedCost are required",
      });
    }

    // Validate severity range
    if (severity < 1 || severity > 10) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Severity must be between 1 and 10",
      });
    }

    // Validate cost is non-negative
    if (estimatedCost < 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Estimated cost must be non-negative",
      });
    }

    // Check if inspection exists
    const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId } });
    if (!inspection) {
      return res.status(404).json({
        error: "Not Found",
        message: `Inspection with id ${inspectionId} not found`,
      });
    }

    // Apply BLADE_DAMAGE + crack rule
    const adjustedSeverity = applySeverityRule(category, notes, severity);

    const finding = await prisma.finding.create({
      data: {
        inspectionId,
        category,
        severity: adjustedSeverity,
        estimatedCost,
        notes: notes?.trim(),
      },
    });

    return res.status(201).json(finding);
  } catch (error) {
    throw error;
  }
};

// PUT /api/findings/:id - Update a finding
export const updateFindingHandler = async (
  req: Request<{ id: string }, {}, UpdateFindingRequest>,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { category, severity, estimatedCost, notes } = req.body;

    const existing = await prisma.finding.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        error: "Not Found",
        message: `Finding with id ${id} not found`,
      });
    }

    // Validate severity if provided
    if (severity !== undefined && (severity < 1 || severity > 10)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Severity must be between 1 and 10",
      });
    }

    // Validate cost if provided
    if (estimatedCost !== undefined && estimatedCost < 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Estimated cost must be non-negative",
      });
    }

    const finalCategory = category !== undefined ? category : existing.category;
    const finalSeverity = severity !== undefined ? severity : existing.severity;
    const finalNotes = notes !== undefined ? notes : existing.notes;

    // Apply BLADE_DAMAGE + crack rule
    const adjustedSeverity = applySeverityRule(finalCategory, finalNotes, finalSeverity);

    const updateData: any = {};
    if (category !== undefined) updateData.category = category;
    if (severity !== undefined) updateData.severity = adjustedSeverity;
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost;
    if (notes !== undefined) updateData.notes = notes?.trim();

    const finding = await prisma.finding.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json(finding);
  } catch (error) {
    throw error;
  }
};

// DELETE /api/findings/:id - Delete a finding
export const deleteFindingHandler = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.finding.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        error: "Not Found",
        message: `Finding with id ${id} not found`,
      });
    }

    await prisma.finding.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    throw error;
  }
};
