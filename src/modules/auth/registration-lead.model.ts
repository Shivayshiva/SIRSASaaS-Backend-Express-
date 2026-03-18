import { Schema, model, Types } from "mongoose";

type LeadStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_CORRECTION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CONVERTED";

type LeadSource =
  | "WEB"
  | "DEMO_REQUEST"
  | "REFERRAL"
  | "SALES_TEAM"
  | "MANUAL";

type DocumentStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "NEEDS_REUPLOAD";

type ReviewAction =
  | "CREATED"
  | "SUBMITTED"
  | "MOVED_TO_REVIEW"
  | "CORRECTION_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CONVERTED"
  | "COMMENT_ADDED";

interface ILeadUploadedFile {
  fileId?: string;
  name?: string;
  url: string;
  thumbnailUrl?: string;
  fileType?: string;
  size?: number;
  mimeType?: string;
}

interface ILeadDocument {
  documentType:
    | "OWNER_ID_PROOF"
    | "OWNER_PAN"
    | "BUSINESS_PAN"
    | "GST_CERTIFICATE"
    | "SHOP_LICENSE"
    | "ADDRESS_PROOF"
    | "OTHER";
  label: string;
  status: DocumentStatus;
  remark?: string;
  files: ILeadUploadedFile[];
  isRequired: boolean;
  uploadedAt?: Date;
  verifiedAt?: Date;
}

interface ILeadShopDraft {
  shopName: string;
  contactNumber?: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  managerName?: string;
  isPrimary?: boolean;
}

interface ILeadOwnerInfo {
  fullName: string;
  email: string;
  mobile: string;
  alternateMobile?: string;
  designation?: string;
}

interface ILeadBusinessInfo {
  businessName: string;
  legalBusinessName?: string;
  businessType?: string;
  gstNumber?: string;
  panNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

interface ILeadPlanInfo {
  planId?: Types.ObjectId;
  planName?: string;
  billingCycle?: "MONTHLY" | "YEARLY";
  trialDays?: number;
}

interface ILeadCorrectionItem {
  fieldKey: string;
  label: string;
  reason: string;
  section: "OWNER_INFO" | "BUSINESS_INFO" | "SHOPS" | "DOCUMENTS" | "PLAN";
  isResolved: boolean;
  resolvedAt?: Date;
}

interface ILeadReview {
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  approvalNote?: string;
  rejectionReason?: string;
  correctionNote?: string;
}

interface ILeadConversion {
  convertedAt?: Date;
  tenantId?: Types.ObjectId;
  adminUserId?: Types.ObjectId;
}

interface ILeadAcknowledgementDetails {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  declarationAccepted: boolean;
}

interface ILeadActivityLog {
  action: ReviewAction;
  note?: string;
  actorId?: Types.ObjectId;
  actorRole?: "SUPERADMIN" | "SYSTEM" | "APPLICANT";
  createdAt: Date;
}

export interface IRegistrationLead {
  requestId: string;
  source: LeadSource;
  status: LeadStatus;
  ownerInfo: ILeadOwnerInfo;
  businessInfo: ILeadBusinessInfo;
  shops: ILeadShopDraft[];
  shopCount: number;
  selectedPlan?: ILeadPlanInfo;
  documents: ILeadDocument[];
  correctionItems: ILeadCorrectionItem[];
  resubmissionCount: number;
  review: ILeadReview;
  conversion?: ILeadConversion;
  generatedPassword?: string;
  acknowledgementDetails?: ILeadAcknowledgementDetails;
  rawPayload?: Record<string, unknown>;
  applicantMessage?: string;
  internalNotes?: string;
  activityLogs: ILeadActivityLog[];
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  lastStatusChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadUploadedFileSchema = new Schema<ILeadUploadedFile>(
  {
    fileId: { type: String, trim: true },
    name: { type: String, trim: true },
    url: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, trim: true },
    fileType: { type: String, trim: true },
    size: { type: Number, min: 0 },
    mimeType: { type: String, trim: true }
  },
  { _id: false }
);

const leadDocumentSchema = new Schema<ILeadDocument>(
  {
    documentType: {
      type: String,
      enum: [
        "OWNER_ID_PROOF",
        "OWNER_PAN",
        "BUSINESS_PAN",
        "GST_CERTIFICATE",
        "SHOP_LICENSE",
        "ADDRESS_PROOF",
        "OTHER"
      ],
      required: true
    },
    label: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "NEEDS_REUPLOAD"],
      default: "PENDING"
    },
    remark: { type: String, trim: true },
    files: { type: [leadUploadedFileSchema], default: [] },
    isRequired: { type: Boolean, default: true },
    uploadedAt: { type: Date },
    verifiedAt: { type: Date }
  },
  { _id: false }
);

const leadShopDraftSchema = new Schema<ILeadShopDraft>(
  {
    shopName: { type: String, required: true, trim: true },
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "India" },
    managerName: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false }
  },
  { _id: false }
);

const leadOwnerInfoSchema = new Schema<ILeadOwnerInfo>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, required: true, trim: true },
    alternateMobile: { type: String, trim: true },
    designation: { type: String, trim: true }
  },
  { _id: false }
);

const leadBusinessInfoSchema = new Schema<ILeadBusinessInfo>(
  {
    businessName: { type: String, required: true, trim: true },
    legalBusinessName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    gstNumber: { type: String, trim: true, uppercase: true },
    panNumber: { type: String, trim: true, uppercase: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "India" }
  },
  { _id: false }
);

const leadPlanInfoSchema = new Schema<ILeadPlanInfo>(
  {
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    planName: { type: String, trim: true },
    billingCycle: { type: String, enum: ["MONTHLY", "YEARLY"] },
    trialDays: { type: Number, min: 0, default: 30 }
  },
  { _id: false }
);

const leadCorrectionItemSchema = new Schema<ILeadCorrectionItem>(
  {
    fieldKey: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    section: {
      type: String,
      enum: ["OWNER_INFO", "BUSINESS_INFO", "SHOPS", "DOCUMENTS", "PLAN"],
      required: true
    },
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date }
  },
  { _id: false }
);

const leadReviewSchema = new Schema<ILeadReview>(
  {
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    approvalNote: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    correctionNote: { type: String, trim: true }
  },
  { _id: false }
);

const leadConversionSchema = new Schema<ILeadConversion>(
  {
    convertedAt: { type: Date },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
    adminUserId: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { _id: false }
);

const leadAcknowledgementDetailsSchema = new Schema<ILeadAcknowledgementDetails>(
  {
    termsAccepted: { type: Boolean, required: true, default: false },
    privacyAccepted: { type: Boolean, required: true, default: false },
    declarationAccepted: { type: Boolean, required: true, default: false }
  },
  { _id: false }
);

const leadActivityLogSchema = new Schema<ILeadActivityLog>(
  {
    action: {
      type: String,
      enum: [
        "CREATED",
        "SUBMITTED",
        "MOVED_TO_REVIEW",
        "CORRECTION_REQUESTED",
        "RESUBMITTED",
        "APPROVED",
        "REJECTED",
        "CONVERTED",
        "COMMENT_ADDED"
      ],
      required: true
    },
    note: { type: String, trim: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: {
      type: String,
      enum: ["SUPERADMIN", "SYSTEM", "APPLICANT"]
    },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const registrationLeadSchema = new Schema<IRegistrationLead>(
  {
    requestId: { type: String, required: true, trim: true, unique: true },
    source: {
      type: String,
      enum: ["WEB", "DEMO_REQUEST", "REFERRAL", "SALES_TEAM", "MANUAL"],
      default: "WEB"
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "NEEDS_CORRECTION",
        "RESUBMITTED",
        "APPROVED",
        "REJECTED",
        "CONVERTED"
      ],
      default: "DRAFT"
    },
    ownerInfo: { type: leadOwnerInfoSchema, required: true },
    businessInfo: { type: leadBusinessInfoSchema, required: true },
    shops: { type: [leadShopDraftSchema], default: [] },
    shopCount: { type: Number, required: true, min: 1, default: 1 },
    selectedPlan: { type: leadPlanInfoSchema },
    documents: { type: [leadDocumentSchema], default: [] },
    correctionItems: { type: [leadCorrectionItemSchema], default: [] },
    resubmissionCount: { type: Number, default: 0, min: 0 },
    review: { type: leadReviewSchema, default: {} },
    conversion: { type: leadConversionSchema },
    generatedPassword: { type: String },
    acknowledgementDetails: { type: leadAcknowledgementDetailsSchema },
    rawPayload: { type: Schema.Types.Mixed },
    applicantMessage: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    activityLogs: { type: [leadActivityLogSchema], default: [] },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    lastStatusChangedAt: { type: Date }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

registrationLeadSchema.index({ requestId: 1 }, { unique: true });
registrationLeadSchema.index({ "ownerInfo.email": 1, createdAt: -1 });
registrationLeadSchema.index({ "ownerInfo.mobile": 1, createdAt: -1 });
registrationLeadSchema.index({ status: 1, createdAt: -1 });
registrationLeadSchema.index({ source: 1, createdAt: -1 });
registrationLeadSchema.index({ "conversion.tenantId": 1 });

export const RegistrationLeadModel = model<IRegistrationLead>(
  "RegistrationLead",
  registrationLeadSchema
);
