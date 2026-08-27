import { RequestHandler } from "express";
import { ZodTypeAny } from "zod";
import { ApiError } from "./errors";

type Target = "body" | "query" | "params";

/** Validates req[target] against a zod schema, replacing it with the parsed value. */
export function validate(schema: ZodTypeAny, target: Target = "body"): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      throw ApiError.badRequest("Validation failed", result.error.flatten());
    }
    (req as any)[target] = result.data;
    next();
  };
}
