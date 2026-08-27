import { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/errors";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: `Duplicate value for: ${(err.meta?.target as string[])?.join(", ")}` });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ error: "Related record not found or in use" });
    }
  }

  // eslint-disable-next-line no-console
  console.error(err);
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : String(err?.message ?? err);
  res.status(500).json({ error: message });
};

export function notFoundHandler(_req: any, res: any) {
  res.status(404).json({ error: "Route not found" });
}
