import { z } from "zod";

import { TENANT_BUSINESS_TYPES } from "../users/user.types";

const documentUrlsSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return [];
    }

    if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmedValue);
        return Array.isArray(parsed) ? parsed : [trimmedValue];
      } catch {
        return [trimmedValue];
      }
    }

    return [trimmedValue];
  }

  return value;
}, z.array(z.url()));

export const registerLeadSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    phone: z.string().trim().min(7).max(20).optional(),
    password: z.string().min(8).max(128),
    businessName: z.string().trim().min(2).max(160),
    businessType: z.enum(TENANT_BUSINESS_TYPES),
    shopName: z.string().trim().min(2).max(160),
    shopCode: z.string().trim().min(2).max(20).optional(),
    shopPhone: z.string().trim().min(7).max(20).optional(),
    shopEmail: z.email().trim().toLowerCase().optional(),
    shopGstNumber: z.string().trim().max(30).optional(),
    shopStreet: z.string().trim().max(160).optional(),
    shopCity: z.string().trim().max(100).optional(),
    shopState: z.string().trim().max(100).optional(),
    shopPincode: z.string().trim().max(20).optional(),
    openingTime: z.string().trim().max(20).optional(),
    closingTime: z.string().trim().max(20).optional(),
    subscriptionPlanName: z.string().trim().min(2).max(60).optional(),
    subscriptionPlanPrice: z.coerce.number().min(0).optional(),
    subscriptionBillingCycle: z.enum(["monthly", "yearly"]).optional(),
    documentUrls: documentUrlsSchema.default([])
  })
  .superRefine((data, ctx) => {
    const hasAnySubscriptionField =
      data.subscriptionPlanName !== undefined ||
      data.subscriptionPlanPrice !== undefined ||
      data.subscriptionBillingCycle !== undefined;

    if (hasAnySubscriptionField) {
      if (!data.subscriptionPlanName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subscriptionPlanName"],
          message:
            "subscriptionPlanName is required when subscription fields are provided"
        });
      }

      if (data.subscriptionPlanPrice === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subscriptionPlanPrice"],
          message:
            "subscriptionPlanPrice is required when subscription fields are provided"
        });
      }

      if (!data.subscriptionBillingCycle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subscriptionBillingCycle"],
          message:
            "subscriptionBillingCycle is required when subscription fields are provided"
        });
      }
    }
  });

const uploadedFileSchema = z.object({
  fileId: z.string().trim().optional(),
  name: z.string().trim().optional(),
  url: z.url(),
  thumbnailUrl: z.url().optional(),
  fileType: z.string().trim().optional(),
  size: z.coerce.number().min(0).optional(),
  mimeType: z.string().trim().optional()
});

const uploadedDocumentsBatchSchema = z.object({
  uploadedCount: z.coerce.number().int().min(0).optional(),
  files: z.array(uploadedFileSchema).min(1)
});

const uploadedDocumentsBatchListSchema = z
  .array(uploadedDocumentsBatchSchema)
  .default([]);

const registerLeadV2ShopSchema = z
  .object({
    shopName: z.string().trim().min(2).max(160),
    displayName: z.string().trim().max(160).optional(),
    shopLogo: uploadedDocumentsBatchListSchema.optional().default([]),
    shopBanner: uploadedDocumentsBatchListSchema.optional().default([]),
    businessType: z.string().trim().max(80).optional(),
    shopType: z.string().trim().max(80).optional(),
    shopDescription: z.string().trim().max(2000).optional(),
    yearOfEstablishment: z.string().trim().max(10).optional(),
    addressLine1: z.string().trim().min(2).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    area: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    pincode: z.string().trim().max(20).optional(),
    landmark: z.string().trim().max(120).optional(),
    latitudeLongitude: z.string().trim().max(100).optional(),
    shopNumber: z.string().trim().min(7).max(20).optional(),
    email: z.email().trim().toLowerCase().optional(),
    whatsapp: z.string().trim().min(7).max(20).optional(),
    gstNumber: z.string().trim().max(30).optional(),
    shopLicense: uploadedDocumentsBatchListSchema.optional().default([]),
    shopPhoto: uploadedDocumentsBatchListSchema.optional().default([])
  })
  .strict();

export const registerLeadV2Schema = z
  .object({
    requestId: z.string().trim().min(1).optional(),
    ownerDetail: z
      .object({
        ownerName: z.string().trim().min(2).max(160),
        ownerAddress: z.string().trim().min(2).max(300),
        ownerProfilePhoto: uploadedDocumentsBatchListSchema.optional().default([]),
        aadhaarNumber: z.string().trim().max(20).optional(),
        panNumber: z.string().trim().max(20).optional(),
        aadhaarPhoto: uploadedDocumentsBatchListSchema.optional().default([]),
        panPhoto: uploadedDocumentsBatchListSchema.optional().default([]),
        registrationPhoto: uploadedDocumentsBatchListSchema.optional().default([]),
        gender: z.string().trim().max(30).optional(),
        dateOfBirth: z.string().trim().max(20).optional(),
        mobile: z.string().trim().min(7).max(20),
        alternateMobile: z.string().trim().min(7).max(20).optional(),
        email: z.email().trim().toLowerCase(),
        whatsapp: z.string().trim().min(7).max(20).optional(),
        sameAsMobileWhatsapp: z.boolean().optional().default(false),
        userSelfie: uploadedDocumentsBatchListSchema.optional().default([]),
        shopCount: z.coerce.number().int().min(1).default(1)
      })
      .strict(),
    shops: z.array(registerLeadV2ShopSchema).min(1),
    acknowledgementDetails: z
      .object({
        termsAccepted: z.literal(true),
        privacyAccepted: z.literal(true),
        declarationAccepted: z.literal(true)
      })
      .strict()
  })
  .strict()
  .transform((value) => {
    const ownerBatches = [
      ...value.ownerDetail.ownerProfilePhoto,
      ...value.ownerDetail.aadhaarPhoto,
      ...value.ownerDetail.panPhoto,
      ...value.ownerDetail.registrationPhoto,
      ...value.ownerDetail.userSelfie
    ];

    const shopBatches = value.shops.flatMap((shop) => [
      ...shop.shopLogo,
      ...shop.shopBanner,
      ...shop.shopLicense,
      ...shop.shopPhoto
    ]);

    const documentUrls = [...ownerBatches, ...shopBatches].flatMap((batch) =>
      batch.files.map((file) => file.url)
    );

    return {
      ...value,
      documentUrls
    };
  });

export const registerLeadCaptureSchema = z
  .object({
    requestId: z.string().trim().min(1),
    fullName: z.string().trim().min(2).max(160),
    email: z.email().trim().toLowerCase(),
    mobile: z.string().trim().min(7).max(20),
    shopCount: z.coerce.number().int().min(1).default(1),
    uploadedDocuments: z.array(uploadedDocumentsBatchSchema).min(1)
  })
  .transform((value) => ({
    ...value,
    documentUrls: value.uploadedDocuments.flatMap((batch) =>
      batch.files.map((file) => file.url)
    )
  }));

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1)
});

export const requestOtpSchema = z.object({
  applicationId: z.string().trim().min(1)
});

export const verifyOtpSchema = z.object({
  applicationId: z.string().trim().min(1),
  otp: z.string().trim().min(1)
});
