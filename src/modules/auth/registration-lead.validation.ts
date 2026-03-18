import { z } from "zod";

const LEAD_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_CORRECTION",
  "RESUBMITTED",
  "APPROVED",
  "REJECTED",
  "CONVERTED"
] as const;

const LEAD_SOURCES = [
  "WEB",
  "DEMO_REQUEST",
  "REFERRAL",
  "SALES_TEAM",
  "MANUAL"
] as const;

const LEAD_REVIEW_SECTIONS = [
  "owner",
  "business",
  "shops",
  "documents",
  "plan"
] as const;

const leadReviewActionSchema = z
  .enum(["Accepted", "Rejected", "accepted", "rejected"])
  .transform((value) =>
    value.toLowerCase() === "accepted" ? "Accepted" : "Rejected"
  );

const ownerInfoPatchSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160).optional(),
    email: z.email().trim().toLowerCase().optional(),
    mobile: z.string().trim().min(7).max(20).optional(),
    alternateMobile: z.string().trim().min(7).max(20).optional(),
    designation: z.string().trim().max(120).optional()
  })
  .strict();

const businessInfoPatchSchema = z
  .object({
    businessName: z.string().trim().min(2).max(160).optional(),
    legalBusinessName: z.string().trim().max(160).optional(),
    businessType: z.string().trim().max(80).optional(),
    gstNumber: z.string().trim().max(30).optional(),
    panNumber: z.string().trim().max(30).optional(),
    addressLine1: z.string().trim().max(160).optional(),
    addressLine2: z.string().trim().max(160).optional(),
    landmark: z.string().trim().max(120).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    pincode: z.string().trim().max(20).optional(),
    country: z.string().trim().max(80).optional()
  })
  .strict();

const selectedPlanPatchSchema = z
  .object({
    planId: z.string().trim().min(1).optional(),
    planName: z.string().trim().min(1).max(120).optional(),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
    trialDays: z.coerce.number().int().min(0).optional()
  })
  .strict();

export const listRegistrationLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  search: z.string().trim().min(1).max(160).optional()
});

export const updateRegistrationLeadSchema = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    source: z.enum(LEAD_SOURCES).optional(),
    ownerInfo: ownerInfoPatchSchema.optional(),
    businessInfo: businessInfoPatchSchema.optional(),
    selectedPlan: selectedPlanPatchSchema.optional(),
    shopCount: z.coerce.number().int().min(1).optional(),
    applicantMessage: z.string().trim().min(1).max(2000).nullable().optional(),
    internalNotes: z.string().trim().min(1).max(2000).nullable().optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required to update the lead"
      });
    }

    if (value.ownerInfo && Object.keys(value.ownerInfo).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerInfo"],
        message: "ownerInfo must contain at least one field"
      });
    }

    if (value.businessInfo && Object.keys(value.businessInfo).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessInfo"],
        message: "businessInfo must contain at least one field"
      });
    }

    if (value.selectedPlan && Object.keys(value.selectedPlan).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedPlan"],
        message: "selectedPlan must contain at least one field"
      });
    }
  });

export const reviewRegistrationLeadFieldSchema = z
  .object({
    requestId: z.string().trim().min(1),
    section: z.enum(LEAD_REVIEW_SECTIONS),
    fieldKey: z.string().trim().min(1).max(160),
    acceptStatus: z.boolean(),
    action: leadReviewActionSchema,
    remark: z.string().trim().min(1).max(1000).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.acceptStatus && value.action !== "Accepted") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["action"],
        message: "action must be Accepted when acceptStatus is true"
      });
    }

    if (!value.acceptStatus && value.action !== "Rejected") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["action"],
        message: "action must be Rejected when acceptStatus is false"
      });
    }

    if (!value.acceptStatus && !value.remark) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["remark"],
        message: "remark is required when rejecting a field"
      });
    }
  });

export const approveRegistrationLeadSchema = z
  .object({
    remark: z.string().trim().min(1).max(1000).optional()
  })
  .strict();

export type ListRegistrationLeadsQuery = z.infer<
  typeof listRegistrationLeadsQuerySchema
>;
export type UpdateRegistrationLeadPayload = z.infer<
  typeof updateRegistrationLeadSchema
>;
export type ReviewRegistrationLeadFieldPayload = z.infer<
  typeof reviewRegistrationLeadFieldSchema
>;
export type ApproveRegistrationLeadPayload = z.infer<
  typeof approveRegistrationLeadSchema
>;
