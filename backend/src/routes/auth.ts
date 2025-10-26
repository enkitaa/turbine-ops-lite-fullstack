import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createAuthService } from "../utils/auth.js";
import { verifyPassword } from "../utils/password.js";

const prisma = new PrismaClient();
const authService = createAuthService();

interface LoginRequest {
  email: string;
  password: string;
}

export const loginHandler = async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email and password are required",
      });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Verify user exists
    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    // Create JWT token
    const token = authService.createToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Return token and user info (excluding password hash)
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    throw error;
  }
};
