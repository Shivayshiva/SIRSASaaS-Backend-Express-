import { z } from "zod";

import { SUBSCRIPTION_STATUSES, USER_ROLES } from "./user.types";

export const createShopSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(20).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  email: z.email().trim().toLowerCase().optional(),
  address: z
    .object({
      street: z.string().trim().max(160).optional(),
      city: z.string().trim().max(100).optional(),
      state: z.string().trim().max(100).optional(),
      pincode: z.string().trim().max(20).optional()
    })
    .optional(),
  managerId: z.string().trim().optional(),
  openingHours: z
    .object({
      openingTime: z.string().trim().max(20).optional(),
      closingTime: z.string().trim().max(20).optional()
    })
    .optional(),
  gstNumber: z.string().trim().max(30).optional()
});

export const createAdminTeamUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z.string().min(8).max(128),
  role: z.enum(["MANAGER", "STAFF"]),
  shopId: z.string().trim().optional(),
  permissions: z.array(z.string().trim().min(1)).default([])
});

export const createManagerStaffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z.string().min(8).max(128),
  permissions: z.array(z.string().trim().min(1)).default([])
});

export const updateSubscriptionStatusSchema = z.object({
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES)
});

export const listUsersQuerySchema = z.object({
  role: z.enum(USER_ROLES).optional()
});

