import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../config/env";
import { ApiError } from "../../core/utils/api-error";
import { USER_ROLES, UserRole } from "../users/user.types";
import { AuthUserPayload } from "./auth.types";

const parseBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const parseAccessTokenFromCookie = (req: Request): string | null => {
  const cookieToken = req.cookies?.access_token;
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken;
  }

  return null;
};

const isValidRole = (role: unknown): role is UserRole => {
  return typeof role === "string" && USER_ROLES.includes(role as UserRole);
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const token =
    parseAccessTokenFromCookie(req) ??
    parseBearerToken(req.headers.authorization);

  if (!token) {
    throw new ApiError(401, "Authorization token is required");
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (_error) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new ApiError(401, "Invalid token payload");
  }

  const payload = decoded as Record<string, unknown>;
  const tokenType = payload.type;
  const role = payload.role;
  const userId = payload.sub;

  if (tokenType !== "access" || !isValidRole(role) || typeof userId !== "string") {
    throw new ApiError(401, "Invalid token payload");
  }

  req.user = {
    userId,
    role,
    tenantId:
      typeof payload.tenantId === "string" ? payload.tenantId : undefined,
    shopId: typeof payload.shopId === "string" ? payload.shopId : undefined
  };

  next();
};

export const requireRoles =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, "Authentication is required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have access to this route");
    }

    next();
  };
