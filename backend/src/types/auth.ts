export type UserRole = "ADMIN" | "ENGINEER" | "VIEWER";

export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload extends JwtUser {
  iat?: number;
  exp?: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}
