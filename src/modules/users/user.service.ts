import bcrypt from "bcryptjs";
import { Types } from "mongoose";

import { ApiError } from "../../core/utils/api-error";
import { IUser, UserModel } from "./user.model";
import { UserRole } from "./user.types";

interface CreateScopedUserInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  tenantId?: Types.ObjectId;
  shopId?: Types.ObjectId;
  permissions?: string[];
  createdBy?: Types.ObjectId;
}

interface ListUsersByTenantInput {
  tenantId: Types.ObjectId;
  roles?: UserRole[];
  shopId?: Types.ObjectId;
}

interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  tenantId?: string;
  shopId?: string;
  permissions: string[];
  status: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const hasDuplicateKeyError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  return (error as { code?: number }).code === 11000;
};

const toSafeUser = (user: IUser): SafeUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  tenantId: user.tenantId?.toString(),
  shopId: user.shopId?.toString(),
  permissions: user.permissions,
  status: user.status,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const userService = {
  async createScopedUser(input: CreateScopedUserInput) {
    const existingUser = await UserModel.findOne({
      email: input.email,
      isDeleted: false
    }).exec();

    if (existingUser) {
      throw new ApiError(409, "Email is already in use");
    }

    try {
      const passwordHash = await bcrypt.hash(input.password, 12);

      const user = await UserModel.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: input.role,
        tenantId: input.tenantId,
        shopId: input.shopId,
        permissions: input.permissions ?? [],
        status: "ACTIVE",
        createdBy: input.createdBy,
        updatedBy: input.createdBy
      });

      return toSafeUser(user);
    } catch (error) {
      if (hasDuplicateKeyError(error)) {
        throw new ApiError(409, "Duplicate value violates a unique constraint");
      }

      throw error;
    }
  },

  async listUsersByTenant(input: ListUsersByTenantInput) {
    const filters: Record<string, unknown> = {
      tenantId: input.tenantId,
      isDeleted: false
    };

    if (input.roles && input.roles.length > 0) {
      filters.role = { $in: input.roles };
    }

    if (input.shopId) {
      filters.shopId = input.shopId;
    }

    return UserModel.find(filters)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  },

  async listGlobalUsers(role?: UserRole) {
    const filters: Record<string, unknown> = {
      isDeleted: false
    };

    if (role) {
      filters.role = role;
    }

    return UserModel.find(filters)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  },

  async getUserProfile(userId: Types.ObjectId) {
    const user = await UserModel.findOne({
      _id: userId,
      isDeleted: false
    })
      .select("-passwordHash")
      .lean()
      .exec();

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  }
};

