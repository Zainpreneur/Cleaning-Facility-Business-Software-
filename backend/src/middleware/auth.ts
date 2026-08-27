import { RequestHandler } from "express";
import { Role } from "../types/enums";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/errors";

/** Requires a valid Bearer JWT; attaches the decoded user to req.user. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or invalid Authorization header");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role as Role, email: payload.email, name: payload.name };
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
};

/** Restricts a route to one or more roles. Use after requireAuth. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`Requires one of roles: ${roles.join(", ")}`);
    }
    next();
  };
}
