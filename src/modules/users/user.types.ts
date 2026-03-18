export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "STAFF",
  "CUSTOMER"
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const TENANT_BUSINESS_TYPES = [
  "CLOTHING",
  "SAREE",
  "GROCERY",
  "ELECTRONICS",
  "MULTI"
] as const;
export type TenantBusinessType = (typeof TENANT_BUSINESS_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "EXPIRED", "TRIAL"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_CYCLES = ["monthly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

