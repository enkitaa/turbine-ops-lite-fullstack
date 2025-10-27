import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateTurbineRequest {
  name: string;
  manufacturer?: string;
  mwRating?: number;
  lat?: number;
  lng?: number;
}

interface UpdateTurbineRequest {
  name?: string;
  manufacturer?: string;
  mwRating?: number;
  lat?: number;
  lng?: number;
}

// GET /api/turbines - List all turbines
export const getTurbinesHandler = async (_req: Request, res: Response) => {
  try {
    const turbines = await prisma.turbine.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(turbines);
  } catch (error) {
    throw error;
  }
};

// POST /api/turbines - Create a new turbine
export const createTurbineHandler = async (
  req: Request<{}, {}, CreateTurbineRequest>,
  res: Response,
) => {
  try {
    const { name, manufacturer, mwRating, lat, lng } = req.body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Turbine name is required",
      });
    }

    // Validate optional fields
    if (mwRating !== undefined && (mwRating < 0 || mwRating > 100)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "MW rating must be between 0 and 100",
      });
    }

    if (lat !== undefined && (lat < -90 || lat > 90)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Latitude must be between -90 and 90",
      });
    }

    if (lng !== undefined && (lng < -180 || lng > 180)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Longitude must be between -180 and 180",
      });
    }

    const turbine = await prisma.turbine.create({
      data: {
        name: name.trim(),
        manufacturer: manufacturer?.trim(),
        mwRating,
        lat,
        lng,
      },
    });

    return res.status(201).json(turbine);
  } catch (error) {
    throw error;
  }
};

// PUT /api/turbines/:id - Update a turbine
export const updateTurbineHandler = async (
  req: Request<{ id: string }, {}, UpdateTurbineRequest>,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { name, manufacturer, mwRating, lat, lng } = req.body;

    // Check if turbine exists
    const existingTurbine = await prisma.turbine.findUnique({
      where: { id },
    });

    if (!existingTurbine) {
      return res.status(404).json({
        error: "Not Found",
        message: `Turbine with id ${id} not found`,
      });
    }

    // Validate optional fields if provided
    if (mwRating !== undefined && (mwRating < 0 || mwRating > 100)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "MW rating must be between 0 and 100",
      });
    }

    if (lat !== undefined && (lat < -90 || lat > 90)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Latitude must be between -90 and 90",
      });
    }

    if (lng !== undefined && (lng < -180 || lng > 180)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Longitude must be between -180 and 180",
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer?.trim() || null;
    if (mwRating !== undefined) updateData.mwRating = mwRating;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;

    const turbine = await prisma.turbine.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json(turbine);
  } catch (error) {
    throw error;
  }
};

// DELETE /api/turbines/:id - Delete a turbine
export const deleteTurbineHandler = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    // Check if turbine exists
    const existingTurbine = await prisma.turbine.findUnique({
      where: { id },
      include: {
        inspections: {
          take: 1,
        },
      },
    });

    if (!existingTurbine) {
      return res.status(404).json({
        error: "Not Found",
        message: `Turbine with id ${id} not found`,
      });
    }

    // Check if turbine has inspections
    if (existingTurbine.inspections.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "Cannot delete turbine with existing inspections",
      });
    }

    await prisma.turbine.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    throw error;
  }
};
