import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import { emailService } from "../../common/services/email.service";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { ApiError } from "../../core/utils/api-error";
import { ShopModel } from "../shops/shop.model";
import { shopService } from "../shops/shop.service";
import { TenantModel } from "../tenants/tenant.model";
import { IUser, UserModel } from "../users/user.model";
import { BillingCycle, TENANT_BUSINESS_TYPES, TenantBusinessType } from "../users/user.types";
import { RegistrationLeadModel } from "./registration-lead.model";
import {
  ApproveRegistrationLeadPayload,
  ListRegistrationLeadsQuery,
  ReviewRegistrationLeadFieldPayload,
  UpdateRegistrationLeadPayload
} from "./registration-lead.validation";

interface UpdateRegistrationLeadInput {
  leadId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  payload: UpdateRegistrationLeadPayload;
}

interface ReviewRegistrationLeadFieldInput {
  leadIdentifier: string;
  actorUserId: Types.ObjectId;
  payload: ReviewRegistrationLeadFieldPayload;
}

interface ApproveRegistrationLeadInput {
  leadIdentifier: string;
  actorUserId: Types.ObjectId;
  payload: ApproveRegistrationLeadPayload;
}

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const hasDuplicateKeyError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  return (error as { code?: number }).code === 11000;
};

const getDefaultSubscriptionPlan = () => ({
  planName: "Starter",
  price: 0,
  billingCycle: "monthly" as BillingCycle
});

const getDefaultSubscriptionStatus = () => "TRIAL" as const;

const isTenantBusinessType = (value: unknown): value is TenantBusinessType => {
  return (
    typeof value === "string" &&
    (TENANT_BUSINESS_TYPES as readonly string[]).includes(value)
  );
};

const getBusinessTypeFromLead = (value: unknown): TenantBusinessType => {
  if (isTenantBusinessType(value)) {
    return value;
  }

  return "MULTI";
};

const generateTemporaryPassword = (): string => {
  return randomBytes(9).toString("base64url");
};

const buildResetPasswordLink = (token: string, email: string): string => {
  const baseUrl = env.CORS_ORIGIN.replace(/\/+$/, "");
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
};

const getStatusAction = (
  status: NonNullable<UpdateRegistrationLeadPayload["status"]>
):
  | "SUBMITTED"
  | "MOVED_TO_REVIEW"
  | "CORRECTION_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CONVERTED"
  | "COMMENT_ADDED" => {
  switch (status) {
    case "SUBMITTED":
      return "SUBMITTED";
    case "UNDER_REVIEW":
      return "MOVED_TO_REVIEW";
    case "NEEDS_CORRECTION":
      return "CORRECTION_REQUESTED";
    case "RESUBMITTED":
      return "RESUBMITTED";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "CONVERTED":
      return "CONVERTED";
    default:
      return "COMMENT_ADDED";
  }
};

const mapNestedFieldsToSet = (
  prefix: string,
  value: Record<string, unknown>,
  setOperations: Record<string, unknown>
) => {
  Object.entries(value).forEach(([field, fieldValue]) => {
    if (fieldValue !== undefined) {
      setOperations[`${prefix}.${field}`] = fieldValue;
    }
  });
};

const mapReviewSection = (
  section: ReviewRegistrationLeadFieldPayload["section"]
): "OWNER_INFO" | "BUSINESS_INFO" | "SHOPS" | "DOCUMENTS" | "PLAN" => {
  switch (section) {
    case "owner":
      return "OWNER_INFO";
    case "business":
      return "BUSINESS_INFO";
    case "shops":
      return "SHOPS";
    case "documents":
      return "DOCUMENTS";
    default:
      return "PLAN";
  }
};

const buildLeadLookupFilters = (
  leadIdentifier: string,
  requestId?: string
): Array<Record<string, unknown>> => {
  const values = new Set<string>();
  const normalizedLeadIdentifier = leadIdentifier.trim();

  if (normalizedLeadIdentifier) {
    values.add(normalizedLeadIdentifier);
  }

  const normalizedRequestId = requestId?.trim();
  if (normalizedRequestId) {
    values.add(normalizedRequestId);
  }

  const filters: Array<Record<string, unknown>> = [];
  values.forEach((value) => {
    filters.push({ requestId: value });
    if (Types.ObjectId.isValid(value)) {
      filters.push({ _id: new Types.ObjectId(value) });
    }
  });

  return filters;
};

const buildLeadLookupQuery = (
  leadIdentifier: string,
  requestId?: string
): Record<string, unknown> => {
  const leadLookupFilters = buildLeadLookupFilters(leadIdentifier, requestId);

  if (leadLookupFilters.length === 0) {
    throw new ApiError(400, "Invalid lead identifier");
  }

  if (leadLookupFilters.length === 1) {
    return leadLookupFilters[0];
  }

  return { $or: leadLookupFilters };
};

export const registrationLeadService = {
  async listRegistrationLeads(query: ListRegistrationLeadsQuery) {
    const filters: Record<string, unknown> = {};

    if (query.status) {
      filters.status = query.status;
    }

    if (query.source) {
      filters.source = query.source;
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      filters.$or = [
        { requestId: searchRegex },
        { "ownerInfo.fullName": searchRegex },
        { "ownerInfo.email": searchRegex },
        { "ownerInfo.mobile": searchRegex },
        { "businessInfo.businessName": searchRegex }
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      RegistrationLeadModel.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean()
        .exec(),
      RegistrationLeadModel.countDocuments(filters).exec()
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
      }
    };
  },

  async getRegistrationLead(leadIdentifier: string) {
    const lookupQuery = buildLeadLookupQuery(leadIdentifier);
    const lead = await RegistrationLeadModel.findOne(lookupQuery).lean().exec();

    if (!lead) {
      throw new ApiError(404, "Registration lead not found");
    }

    return lead;
  },

  async updateRegistrationLead(input: UpdateRegistrationLeadInput) {
    const { payload } = input;
    const now = new Date();
    const setOperations: Record<string, unknown> = {};
    const unsetOperations: Record<string, unknown> = {};

    if (payload.status !== undefined) {
      setOperations.status = payload.status;
      setOperations.lastStatusChangedAt = now;

      if (payload.status === "SUBMITTED") {
        setOperations.submittedAt = now;
      }

      if (payload.status === "APPROVED") {
        setOperations.approvedAt = now;
      }

      if (payload.status === "REJECTED") {
        setOperations.rejectedAt = now;
      }
    }

    if (payload.source !== undefined) {
      setOperations.source = payload.source;
    }

    if (payload.ownerInfo) {
      mapNestedFieldsToSet(
        "ownerInfo",
        payload.ownerInfo as Record<string, unknown>,
        setOperations
      );
    }

    if (payload.businessInfo) {
      mapNestedFieldsToSet(
        "businessInfo",
        payload.businessInfo as Record<string, unknown>,
        setOperations
      );
    }

    if (payload.selectedPlan) {
      const selectedPlan = payload.selectedPlan as Record<string, unknown>;
      Object.entries(selectedPlan).forEach(([field, fieldValue]) => {
        if (fieldValue === undefined) {
          return;
        }

        if (field === "planId") {
          if (typeof fieldValue !== "string" || !Types.ObjectId.isValid(fieldValue)) {
            throw new ApiError(400, "selectedPlan.planId must be a valid ObjectId");
          }

          setOperations["selectedPlan.planId"] = new Types.ObjectId(fieldValue);
          return;
        }

        setOperations[`selectedPlan.${field}`] = fieldValue;
      });
    }

    if (payload.shopCount !== undefined) {
      setOperations.shopCount = payload.shopCount;
    }

    if (payload.applicantMessage !== undefined) {
      if (payload.applicantMessage === null) {
        unsetOperations.applicantMessage = 1;
      } else {
        setOperations.applicantMessage = payload.applicantMessage;
      }
    }

    if (payload.internalNotes !== undefined) {
      if (payload.internalNotes === null) {
        unsetOperations.internalNotes = 1;
      } else {
        setOperations.internalNotes = payload.internalNotes;
      }
    }

    const activityAction =
      payload.status !== undefined ? getStatusAction(payload.status) : "COMMENT_ADDED";
    const activityNote =
      payload.status !== undefined
        ? `Lead updated by super admin. Status changed to ${payload.status}.`
        : "Lead fields updated by super admin.";

    const updateOperations: {
      $set?: Record<string, unknown>;
      $unset?: Record<string, unknown>;
      $push: {
        activityLogs: {
          action:
            | "SUBMITTED"
            | "MOVED_TO_REVIEW"
            | "CORRECTION_REQUESTED"
            | "RESUBMITTED"
            | "APPROVED"
            | "REJECTED"
            | "CONVERTED"
            | "COMMENT_ADDED";
          note: string;
          actorId: Types.ObjectId;
          actorRole: "SUPERADMIN";
          createdAt: Date;
        };
      };
    } = {
      $push: {
        activityLogs: {
          action: activityAction,
          note: activityNote,
          actorId: input.actorUserId,
          actorRole: "SUPERADMIN",
          createdAt: now
        }
      }
    };

    if (Object.keys(setOperations).length > 0) {
      updateOperations.$set = setOperations;
    }

    if (Object.keys(unsetOperations).length > 0) {
      updateOperations.$unset = unsetOperations;
    }

    const lead = await RegistrationLeadModel.findOneAndUpdate(
      { _id: input.leadId },
      updateOperations,
      { new: true }
    )
      .lean()
      .exec();

    if (!lead) {
      throw new ApiError(404, "Registration lead not found");
    }

    return lead;
  },

  async reviewRegistrationLeadField(input: ReviewRegistrationLeadFieldInput) {
    const now = new Date();
    const lookupQuery = buildLeadLookupQuery(
      input.leadIdentifier,
      input.payload.requestId
    );
    const lead = await RegistrationLeadModel.findOne(lookupQuery).exec();

    if (!lead) {
      throw new ApiError(404, "Registration lead not found");
    }

    const mappedSection = mapReviewSection(input.payload.section);
    const existingCorrectionItem = lead.correctionItems.find(
      (item) =>
        item.fieldKey === input.payload.fieldKey && item.section === mappedSection
    );

    if (input.payload.acceptStatus) {
      if (existingCorrectionItem) {
        existingCorrectionItem.isResolved = true;
        existingCorrectionItem.resolvedAt = now;
        if (input.payload.remark) {
          existingCorrectionItem.reason = input.payload.remark;
        }
      }

      if (!lead.review) {
        lead.review = {};
      }
      lead.review.reviewedBy = input.actorUserId;
      lead.review.reviewedAt = now;
      if (input.payload.remark) {
        lead.review.approvalNote = input.payload.remark;
      }

      lead.activityLogs.push({
        action: "COMMENT_ADDED",
        note: `Field accepted: ${input.payload.fieldKey}`,
        actorId: input.actorUserId,
        actorRole: "SUPERADMIN",
        createdAt: now
      });
    } else {
      if (existingCorrectionItem) {
        existingCorrectionItem.label = input.payload.fieldKey;
        existingCorrectionItem.reason = input.payload.remark!;
        existingCorrectionItem.isResolved = false;
        existingCorrectionItem.resolvedAt = undefined;
      } else {
        lead.correctionItems.push({
          fieldKey: input.payload.fieldKey,
          label: input.payload.fieldKey,
          reason: input.payload.remark!,
          section: mappedSection,
          isResolved: false
        });
      }

      lead.status = "NEEDS_CORRECTION";
      lead.lastStatusChangedAt = now;

      if (!lead.review) {
        lead.review = {};
      }
      lead.review.reviewedBy = input.actorUserId;
      lead.review.reviewedAt = now;
      lead.review.correctionNote = input.payload.remark!;

      lead.activityLogs.push({
        action: "CORRECTION_REQUESTED",
        note: `Field rejected: ${input.payload.fieldKey}. Remark: ${input.payload.remark!}`,
        actorId: input.actorUserId,
        actorRole: "SUPERADMIN",
        createdAt: now
      });
    }

    await lead.save();
    return lead.toObject();
  },

  async approveRegistrationLead(input: ApproveRegistrationLeadInput) {
    const now = new Date();
    const lookupQuery = buildLeadLookupQuery(input.leadIdentifier);
    const lead = await RegistrationLeadModel.findOne(lookupQuery).exec();

    if (!lead) {
      throw new ApiError(404, "Registration lead not found");
    }

    if (
      lead.status === "CONVERTED" &&
      lead.conversion?.adminUserId &&
      lead.conversion?.tenantId
    ) {
      throw new ApiError(409, "Lead is already approved and converted");
    }

    const existingUser = await UserModel.findOne({
      email: lead.ownerInfo.email,
      isDeleted: false
    }).exec();

    if (existingUser) {
      throw new ApiError(409, "User already exists for this lead email");
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    let adminUser: IUser | null = null;
    let tenantId: Types.ObjectId | null = null;
    let shopId: Types.ObjectId | null = null;

    try {
      adminUser = await UserModel.create({
        name: lead.ownerInfo.fullName,
        email: lead.ownerInfo.email,
        phone: lead.ownerInfo.mobile,
        passwordHash,
        role: "ADMIN",
        permissions: [],
        status: "ACTIVE",
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId
      });

      const documentUrls = lead.documents.flatMap((document) =>
        document.files.map((file) => file.url)
      );

      const tenant = await TenantModel.create({
        ownerUserId: adminUser._id,
        businessName: lead.businessInfo.businessName,
        businessType: getBusinessTypeFromLead(lead.businessInfo.businessType),
        registrationDocumentUrls: documentUrls,
        subscriptionPlan: getDefaultSubscriptionPlan(),
        subscriptionStatus: getDefaultSubscriptionStatus(),
        shopsCount: 0,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId
      });
      tenantId = tenant._id;

      const primaryShop = lead.shops.find((shop) => shop.isPrimary) ?? lead.shops[0];
      const shop = await shopService.createShop({
        tenantId: tenant._id,
        name:
          primaryShop?.shopName?.trim() ||
          `${lead.businessInfo.businessName} Main Shop`,
        phone: primaryShop?.contactNumber ?? lead.ownerInfo.mobile,
        email: primaryShop?.email ?? lead.ownerInfo.email,
        address: {
          street: primaryShop?.addressLine1,
          city: primaryShop?.city,
          state: primaryShop?.state,
          pincode: primaryShop?.pincode
        },
        createdBy: input.actorUserId
      });
      shopId = shop._id;

      await UserModel.updateOne(
        { _id: adminUser._id },
        {
          tenantId: tenant._id,
          shopId: shop._id,
          updatedBy: input.actorUserId
        }
      ).exec();

      const resetPasswordToken = jwt.sign(
        {
          purpose: "RESET_PASSWORD_SETUP"
        },
        env.JWT_ACCESS_SECRET,
        {
          subject: adminUser._id.toString(),
          expiresIn: "24h"
        }
      );
      const resetPasswordLink = buildResetPasswordLink(
        resetPasswordToken,
        adminUser.email
      );

      lead.status = "CONVERTED";
      lead.approvedAt = now;
      lead.lastStatusChangedAt = now;
      lead.conversion = {
        convertedAt: now,
        tenantId: tenant._id,
        adminUserId: adminUser._id
      };
      lead.generatedPassword = temporaryPassword;
      lead.review = {
        ...(lead.review ?? {}),
        reviewedAt: now,
        reviewedBy: input.actorUserId,
        approvalNote:
          input.payload.remark ??
          "Lead approved and converted into active admin account"
      };
      lead.activityLogs.push({
        action: "CONVERTED",
        note: "Lead approved and admin account created",
        actorId: input.actorUserId,
        actorRole: "SUPERADMIN",
        createdAt: now
      });
      await lead.save();

      let emailStatus = {
        sent: true,
        error: null as string | null
      };

      try {
        await emailService.sendLeadApprovalCredentialsEmail({
          to: adminUser.email,
          name: adminUser.name,
          email: adminUser.email,
          temporaryPassword,
          resetPasswordLink,
          businessName: tenant.businessName,
          shopName: shop.name
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send approval email";
        emailStatus = {
          sent: false,
          error: message
        };

        logger.warn(
          {
            err: error,
            leadId: lead._id.toString(),
            email: adminUser.email,
            message
          },
          "Lead approved but credentials email failed"
        );
      }

      return {
        lead: lead.toObject(),
        user: {
          id: adminUser._id.toString(),
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          tenantId: tenant._id.toString(),
          shopId: shop._id.toString()
        },
        credentials: {
          email: adminUser.email,
          password: temporaryPassword,
          resetPasswordLink
        },
        email: emailStatus
      };
    } catch (error) {
      if (shopId) {
        await ShopModel.deleteOne({ _id: shopId }).exec();
      }

      if (tenantId) {
        await TenantModel.deleteOne({ _id: tenantId }).exec();
      }

      if (adminUser) {
        await UserModel.deleteOne({ _id: adminUser._id }).exec();
      }

      if (hasDuplicateKeyError(error)) {
        throw new ApiError(409, "Duplicate value violates a unique constraint");
      }

      throw error;
    }
  },

  async deleteRegistrationLead(leadId: Types.ObjectId) {
    const deletedLead = await RegistrationLeadModel.findOneAndDelete({
      _id: leadId
    })
      .lean()
      .exec();

    if (!deletedLead) {
      throw new ApiError(404, "Registration lead not found");
    }

    return {
      id: deletedLead._id.toString(),
      requestId: deletedLead.requestId
    };
  }
};
