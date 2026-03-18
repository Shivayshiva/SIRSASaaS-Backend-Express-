import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../../config/env";
import { isApiError } from "../utils/api-error";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  const isValidationError = err instanceof ZodError;
  const derivedStatusCode = isValidationError
    ? 400
    : isApiError(err)
      ? err.statusCode
      : 500;
  const statusCode = res.statusCode >= 400 ? res.statusCode : derivedStatusCode;

  const defaultMessage = isValidationError
    ? "Validation failed"
    : err instanceof Error
      ? err.message
      : "Internal server error";
  const message =
    statusCode >= 500 && env.NODE_ENV === "production"
      ? "Internal server error"
      : defaultMessage;

  const responseBody: Record<string, unknown> = {
    success: false,
    message
  };

  if (isValidationError) {
    responseBody.errors = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
  }

  res.status(statusCode).json(responseBody);
};
