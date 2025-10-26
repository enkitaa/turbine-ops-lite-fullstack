import type { NextFunction, Request, Response } from "express";

// Centralized error handler middleware
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response | void => {
  // Log the error for debugging
  console.error("Error:", error);

  // Handle known error types
  if (error instanceof Error) {
    if ("statusCode" in error && typeof error.statusCode === "number") {
      return res.status(error.statusCode).json({
        error: error.name,
        message: error.message,
      });
    }

    // Handle validation errors or other specific error types

    return res.status(500).json({
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }

  // Handle unknown error types
  return res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  });
};

export const notFoundHandler = (req: Request, res: Response): Response => {
  return res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
};
