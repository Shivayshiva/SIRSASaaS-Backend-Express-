import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import path from "path";

import { emailService } from "../../common/services/email.service";
import { env } from "../../config/env";
import { imagekit, imagekitPublicConfig } from "../../config/imagekit";
import { logger } from "../../config/logger";
import { ApiError } from "../../core/utils/api-error";
import { ShopModel } from "../shops/shop.model";
import { shopService } from "../shops/shop.service";
import { TenantModel } from "../tenants/tenant.model";
import { IUser, UserModel } from "../users/user.model";
import {
  BillingCycle,
  SubscriptionStatus,
  TenantBusinessType,
  UserRole
} from "../users/user.types";
import { AuthUserPayload } from "./auth.types";
import { RegistrationLeadModel } from "./registration-lead.model";

interface RegisterLeadInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  businessName: string;
  businessType: TenantBusinessType;
  shopName: string;
  shopCode?: string;
  shopPhone?: string;
  shopEmail?: string;
  shopGstNumber?: string;
  shopStreet?: string;
  shopCity?: string;
  shopState?: string;
  shopPincode?: string;
  openingTime?: string;
  closingTime?: string;
  subscriptionPlanName?: string;
  subscriptionPlanPrice?: number;
  subscriptionBillingCycle?: BillingCycle;
  documentUrls: string[];
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterLeadCaptureInput {
  requestId: string;
  fullName: string;
  email: string;
  mobile: string;
  shopCount: number;
  uploadedDocuments: UploadedDocumentsBatchInput[];
  documentUrls: string[];
}

interface UploadedFileInputDto {
  fileId?: string;
  name?: string;
  url: string;
  thumbnailUrl?: string;
  fileType?: string;
  size?: number;
  mimeType?: string;
}

interface UploadedDocumentsBatchInput {
  uploadedCount?: number;
  files: UploadedFileInputDto[];
}

interface RegisterLeadCaptureV2Input {
  requestId?: string;
  ownerDetail: {
    ownerName: string;
    ownerAddress: string;
    ownerProfilePhoto: UploadedDocumentsBatchInput[];
    aadhaarNumber?: string;
    panNumber?: string;
    aadhaarPhoto: UploadedDocumentsBatchInput[];
    panPhoto: UploadedDocumentsBatchInput[];
    registrationPhoto: UploadedDocumentsBatchInput[];
    gender?: string;
    dateOfBirth?: string;
    mobile: string;
    alternateMobile?: string;
    email: string;
    whatsapp?: string;
    sameAsMobileWhatsapp?: boolean;
    userSelfie: UploadedDocumentsBatchInput[];
    shopCount: number;
  };
  shops: Array<{
    shopName: string;
    displayName?: string;
    shopLogo: UploadedDocumentsBatchInput[];
    shopBanner: UploadedDocumentsBatchInput[];
    businessType?: string;
    shopType?: string;
    shopDescription?: string;
    yearOfEstablishment?: string;
    addressLine1: string;
    addressLine2?: string;
    area?: string;
    city: string;
    state: string;
    pincode?: string;
    landmark?: string;
    latitudeLongitude?: string;
    shopNumber?: string;
    email?: string;
    whatsapp?: string;
    gstNumber?: string;
    shopLicense: UploadedDocumentsBatchInput[];
    shopPhoto: UploadedDocumentsBatchInput[];
  }>;
  acknowledgementDetails: {
    termsAccepted: true;
    privacyAccepted: true;
    declarationAccepted: true;
  };
  documentUrls: string[];
}

interface UploadFileInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  tenantId?: string;
  shopId?: string;
  status: string;
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

interface SessionJwtPayload {
  type: "access" | "refresh";
  role: UserRole;
  tenantId?: string;
  shopId?: string;
  sid?: string;
}

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

const hasDuplicateKeyError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  return (error as { code?: number }).code === 11000;
};

const toSafeUser = (user: IUser): SafeUser => {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    tenantId: user.tenantId?.toString(),
    shopId: user.shopId?.toString(),
    status: user.status,
    permissions: user.permissions,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const toAuthPayload = (user: IUser): AuthUserPayload => ({
  userId: user._id.toString(),
  role: user.role,
  tenantId: user.tenantId?.toString(),
  shopId: user.shopId?.toString()
});

const signAccessToken = (payload: AuthUserPayload): string => {
  return jwt.sign(
    {
      type: "access",
      role: payload.role,
      tenantId: payload.tenantId,
      shopId: payload.shopId
    } satisfies SessionJwtPayload,
    env.JWT_ACCESS_SECRET,
    {
      subject: payload.userId,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN
    }
  );
};

const signRefreshToken = (payload: AuthUserPayload, sessionId: string): string => {
  return jwt.sign(
    {
      type: "refresh",
      role: payload.role,
      tenantId: payload.tenantId,
      shopId: payload.shopId,
      sid: sessionId
    } satisfies SessionJwtPayload,
    env.JWT_REFRESH_SECRET,
    {
      subject: payload.userId,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN
    }
  );
};

const hashToken = async (token: string): Promise<string> => {
  return bcrypt.hash(token, 10);
};

const getRefreshTokenExpiryDate = (): Date => {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000);
};

const getDefaultSubscriptionPlan = () => ({
  planName: "Starter",
  price: 0,
  billingCycle: "monthly" as BillingCycle
});

const getDefaultSubscriptionStatus = (): SubscriptionStatus => "TRIAL";

const createLeadRequestId = (): string => {
  return `REQ-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
};

const toLeadDocumentsFromBatches = (
  batches: UploadedDocumentsBatchInput[],
  documentType:
    | "OWNER_ID_PROOF"
    | "OWNER_PAN"
    | "BUSINESS_PAN"
    | "GST_CERTIFICATE"
    | "SHOP_LICENSE"
    | "ADDRESS_PROOF"
    | "OTHER",
  label: string,
  now: Date
) => {
  return batches
    .filter((batch) => batch.files.length > 0)
    .map((batch) => ({
      documentType,
      label,
      status: "PENDING" as const,
      files: batch.files,
      isRequired: true,
      uploadedAt: now
    }));
};

const issueSessionTokens = async (user: IUser): Promise<SessionTokens> => {
  const authPayload = toAuthPayload(user);
  const sessionId = randomBytes(16).toString("hex");
  const accessToken = signAccessToken(authPayload);
  const refreshToken = signRefreshToken(authPayload, sessionId);
  const refreshTokenHash = await hashToken(refreshToken);

  await UserModel.updateOne(
    { _id: user._id },
    {
      refreshTokenHash,
      refreshTokenExpiresAt: getRefreshTokenExpiryDate()
    }
  ).exec();

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS
  };
};

export const authService = {
  async requestTrackingOtp(input: { applicationId: string }) {
    const lead = await RegistrationLeadModel.findOne({
      requestId: input.applicationId
    })
      .lean()
      .exec();

    if (!lead) {
      throw new ApiError(404, "ApplicationID not found");
    }

    return {
      applicationId: input.applicationId,
      otpSent: true
    };
  },

  async verifyTrackingOtp(input: { applicationId: string; otp: string }) {
    if (input.otp !== "1234") {
      throw new ApiError(400, "Invalid OTP");
    }

    const trackingToken = jwt.sign(
      {
        purpose: "REGISTER_TRACK",
        applicationId: input.applicationId
      },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: "3h"
      }
    );

    return {
      applicationId: input.applicationId,
      token: trackingToken,
      expiresIn: "3h"
    };
  },

  async registerLeadCapture(input: RegisterLeadCaptureInput) {
    const now = new Date();

    const normalizedDocuments = input.uploadedDocuments.map((batch, index) => ({
      documentType: "OTHER" as const,
      label: `Document ${index + 1}`,
      status: "PENDING" as const,
      files: batch.files,
      isRequired: true,
      uploadedAt: now
    }));

    const normalizedShops = Array.from({ length: input.shopCount }, (_, index) => ({
      shopName: `Shop ${index + 1}`,
      addressLine1: "Pending update",
      city: "Pending",
      state: "Pending",
      pincode: "000000",
      country: "India",
      isPrimary: index === 0
    }));

    const lead = await RegistrationLeadModel.findOneAndUpdate(
      { requestId: input.requestId },
      {
        $set: {
          requestId: input.requestId,
          status: "SUBMITTED",
          source: "WEB",
          ownerInfo: {
            fullName: input.fullName,
            email: input.email,
            mobile: input.mobile
          },
          businessInfo: {
            businessName: `${input.fullName} Business`,
            addressLine1: "Pending update",
            city: "Pending",
            state: "Pending",
            pincode: "000000",
            country: "India"
          },
          shops: normalizedShops,
          shopCount: input.shopCount,
          documents: normalizedDocuments,
          submittedAt: now,
          lastStatusChangedAt: now
        },
        $push: {
          activityLogs: {
            action: "SUBMITTED",
            note: "Lead submitted by applicant",
            actorRole: "APPLICANT",
            createdAt: now
          }
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    )
      .lean()
      .exec();

    return {
      lead
    };
  },

  async registerLeadCaptureV2(input: RegisterLeadCaptureV2Input) {
    const now = new Date();
    const requestId = input.requestId?.trim() || createLeadRequestId();
    const primaryShop = input.shops[0];

    const normalizedShops = input.shops.map((shop, index) => ({
      shopName: shop.shopName,
      contactNumber: shop.shopNumber,
      email: shop.email,
      addressLine1: shop.addressLine1,
      addressLine2: shop.addressLine2,
      landmark: shop.landmark ?? shop.area,
      city: shop.city,
      state: shop.state,
      pincode: shop.pincode ?? "000000",
      country: "India",
      isPrimary: index === 0
    }));

    const normalizedDocuments = [
      ...toLeadDocumentsFromBatches(
        input.ownerDetail.ownerProfilePhoto,
        "OWNER_ID_PROOF",
        "Owner Profile Photo",
        now
      ),
      ...toLeadDocumentsFromBatches(
        input.ownerDetail.aadhaarPhoto,
        "OWNER_ID_PROOF",
        "Aadhaar Photo",
        now
      ),
      ...toLeadDocumentsFromBatches(
        input.ownerDetail.panPhoto,
        "OWNER_PAN",
        "Owner PAN Photo",
        now
      ),
      ...toLeadDocumentsFromBatches(
        input.ownerDetail.registrationPhoto,
        "SHOP_LICENSE",
        "Business Registration Photo",
        now
      ),
      ...toLeadDocumentsFromBatches(
        input.ownerDetail.userSelfie,
        "OTHER",
        "Owner Selfie",
        now
      ),
      ...input.shops.flatMap((shop, index) => [
        ...toLeadDocumentsFromBatches(
          shop.shopLogo,
          "OTHER",
          `Shop ${index + 1} Logo`,
          now
        ),
        ...toLeadDocumentsFromBatches(
          shop.shopBanner,
          "OTHER",
          `Shop ${index + 1} Banner`,
          now
        ),
        ...toLeadDocumentsFromBatches(
          shop.shopLicense,
          "SHOP_LICENSE",
          `Shop ${index + 1} License`,
          now
        ),
        ...toLeadDocumentsFromBatches(
          shop.shopPhoto,
          "ADDRESS_PROOF",
          `Shop ${index + 1} Photo`,
          now
        )
      ])
    ];

    const lead = await RegistrationLeadModel.findOneAndUpdate(
      { requestId },
      {
        $set: {
          requestId,
          status: "SUBMITTED",
          source: "WEB",
          ownerInfo: {
            fullName: input.ownerDetail.ownerName,
            email: input.ownerDetail.email,
            mobile: input.ownerDetail.mobile,
            alternateMobile: input.ownerDetail.alternateMobile,
            designation: input.ownerDetail.gender
          },
          businessInfo: {
            businessName:
              primaryShop?.displayName ||
              primaryShop?.shopName ||
              `${input.ownerDetail.ownerName} Business`,
            legalBusinessName: primaryShop?.displayName,
            businessType: primaryShop?.businessType,
            gstNumber: primaryShop?.gstNumber,
            panNumber: input.ownerDetail.panNumber,
            addressLine1: primaryShop?.addressLine1 ?? input.ownerDetail.ownerAddress,
            addressLine2: primaryShop?.addressLine2,
            landmark: primaryShop?.landmark ?? primaryShop?.area,
            city: primaryShop?.city ?? "Pending",
            state: primaryShop?.state ?? "Pending",
            pincode: primaryShop?.pincode ?? "000000",
            country: "India"
          },
          shops: normalizedShops,
          shopCount: Math.max(input.ownerDetail.shopCount, input.shops.length),
          documents: normalizedDocuments,
          applicantMessage: primaryShop?.shopDescription,
          acknowledgementDetails: input.acknowledgementDetails,
          rawPayload: {
            ownerDetail: input.ownerDetail,
            shops: input.shops,
            acknowledgementDetails: input.acknowledgementDetails
          },
          submittedAt: now,
          lastStatusChangedAt: now
        },
        $push: {
          activityLogs: {
            action: "SUBMITTED",
            note: "Lead submitted by applicant",
            actorRole: "APPLICANT",
            createdAt: now
          }
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    )
      .lean()
      .exec();

    return {
      applicationId: requestId,
      lead
    };
  },

  async registerLead(input: RegisterLeadInput) {
    const existingUser = await UserModel.findOne({
      email: input.email,
      isDeleted: false
    }).exec();

    if (existingUser) {
      throw new ApiError(409, "Email is already in use");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    let adminUser: IUser | null = null;
    let tenantId: Types.ObjectId | null = null;
    let shopId: Types.ObjectId | null = null;

    try {
      adminUser = await UserModel.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: "ADMIN",
        permissions: [],
        status: "ACTIVE"
      });

      const tenant = await TenantModel.create({
        ownerUserId: adminUser._id,
        businessName: input.businessName,
        businessType: input.businessType,
        registrationDocumentUrls: input.documentUrls,
        subscriptionPlan:
          input.subscriptionPlanName &&
          input.subscriptionPlanPrice !== undefined &&
          input.subscriptionBillingCycle
            ? {
                planName: input.subscriptionPlanName,
                price: input.subscriptionPlanPrice,
                billingCycle: input.subscriptionBillingCycle
              }
            : getDefaultSubscriptionPlan(),
        subscriptionStatus: getDefaultSubscriptionStatus(),
        shopsCount: 0,
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      });
      tenantId = tenant._id;

      const shop = await shopService.createShop({
        tenantId: tenant._id,
        name: input.shopName,
        code: input.shopCode,
        phone: input.shopPhone,
        email: input.shopEmail,
        address: {
          street: input.shopStreet,
          city: input.shopCity,
          state: input.shopState,
          pincode: input.shopPincode
        },
        openingHours: {
          openingTime: input.openingTime,
          closingTime: input.closingTime
        },
        gstNumber: input.shopGstNumber,
        createdBy: adminUser._id
      });
      shopId = shop._id;

      await UserModel.updateOne(
        { _id: adminUser._id },
        {
          tenantId: tenant._id,
          shopId: shop._id,
          createdBy: adminUser._id,
          updatedBy: adminUser._id
        }
      ).exec();

      const updatedAdminUser = await UserModel.findById(adminUser._id).exec();
      if (!updatedAdminUser) {
        throw new ApiError(500, "Failed to finalize lead registration");
      }

      let registrationEmail = {
        sent: true,
        error: null as string | null
      };

      try {
        await emailService.sendRegistrationEmail({
          to: updatedAdminUser.email,
          name: updatedAdminUser.name,
          businessName: tenant.businessName,
          shopName: shop.name
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to send registration email";
        registrationEmail = {
          sent: false,
          error: message
        };

        logger.warn(
          {
            err: error,
            userId: updatedAdminUser._id.toString(),
            email: updatedAdminUser.email,
            message
          },
          "Registration completed but welcome email failed"
        );
      }

      return {
        user: toSafeUser(updatedAdminUser),
        tenant: {
          id: tenant._id.toString(),
          businessName: tenant.businessName,
          businessType: tenant.businessType,
          subscriptionStatus: tenant.subscriptionStatus,
          shopsCount: tenant.shopsCount + 1
        },
        shop: {
          id: shop._id.toString(),
          name: shop.name,
          code: shop.code,
          phone: shop.phone,
          email: shop.email
        },
        documents: {
          uploadedCount: input.documentUrls.length,
          urls: input.documentUrls
        },
        email: registrationEmail
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

  async login(input: LoginInput) {
    const user = await UserModel.findOne({
      email: input.email,
      isDeleted: false
    }).exec();

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new ApiError(403, "This account is not active");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const sessionTokens = await issueSessionTokens(user);

    return {
      user: toSafeUser(user),
      ...sessionTokens
    };
  },

  async refreshSession(input: { refreshToken: string }) {
    let decoded: unknown;
    try {
      decoded = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET);
    } catch (_error) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    if (typeof decoded !== "object" || decoded === null) {
      throw new ApiError(401, "Invalid refresh token payload");
    }

    const payload = decoded as Record<string, unknown>;
    const userId = payload.sub;
    const tokenType = payload.type;

    if (typeof userId !== "string" || tokenType !== "refresh") {
      throw new ApiError(401, "Invalid refresh token payload");
    }

    const user = await UserModel.findById(userId).exec();
    if (!user || user.isDeleted) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new ApiError(401, "Session is not active");
    }

    if (user.refreshTokenExpiresAt.getTime() <= Date.now()) {
      throw new ApiError(401, "Session has expired");
    }

    const isRefreshTokenValid = await bcrypt.compare(
      input.refreshToken,
      user.refreshTokenHash
    );
    if (!isRefreshTokenValid) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const sessionTokens = await issueSessionTokens(user);

    return {
      user: toSafeUser(user),
      ...sessionTokens
    };
  },

  async logoutSession(input: { refreshToken?: string }) {
    if (!input.refreshToken) {
      return;
    }

    let decoded: unknown;
    try {
      decoded = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET);
    } catch (_error) {
      return;
    }

    if (typeof decoded !== "object" || decoded === null) {
      return;
    }

    const payload = decoded as Record<string, unknown>;
    const userId = payload.sub;
    if (typeof userId !== "string") {
      return;
    }

    await UserModel.updateOne(
      { _id: userId },
      {
        $unset: {
          refreshTokenHash: 1,
          refreshTokenExpiresAt: 1
        }
      }
    ).exec();
  },

  async getMe(userId: string) {
    const user = await UserModel.findById(userId).exec();
    if (!user || user.isDeleted) {
      throw new ApiError(404, "User not found");
    }

    return {
      user: toSafeUser(user)
    };
  },

  async uploadRegisterDocuments(files: UploadFileInput[]) {
    if (files.length === 0) {
      throw new ApiError(400, "At least one document file is required");
    }

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        if (!file.buffer || file.size === 0) {
          throw new ApiError(400, `Uploaded file ${file.originalname} is empty`);
        }

        const extension = path.extname(file.originalname) || ".jpg";
        const uniqueSuffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
        const fileName = `lead-${uniqueSuffix}${extension}`;

        const uploadResult = await imagekit.files.upload({
          file: file.buffer.toString("base64"),
          fileName,
          folder: "/registeredLeads",
          publicKey: imagekitPublicConfig.publicKey,
          useUniqueFileName: true
        });

        if (!uploadResult.fileId) {
          throw new ApiError(500, "Image upload failed: missing fileId");
        }

        return {
          fileId: uploadResult.fileId,
          name: uploadResult.name,
          url: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl,
          fileType: uploadResult.fileType,
          size: uploadResult.size
        };
      })
    );

    return {
      uploadedCount: uploadResults.length,
      files: uploadResults
    };
  }
};
