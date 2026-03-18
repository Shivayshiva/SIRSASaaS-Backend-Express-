import { Schema, Types, model } from "mongoose";

import {
  BILLING_CYCLES,
  SUBSCRIPTION_STATUSES,
  TENANT_BUSINESS_TYPES,
  BillingCycle,
  SubscriptionStatus,
  TenantBusinessType
} from "../users/user.types";

interface SubscriptionPlan {
  planName: string;
  price: number;
  billingCycle: BillingCycle;
}

export interface ITenant {
  _id: Types.ObjectId;
  ownerUserId: Types.ObjectId;
  businessName: string;
  businessType: TenantBusinessType;
  registrationDocumentUrls: string[];
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  shopsCount: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<SubscriptionPlan>(
  {
    planName: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, enum: BILLING_CYCLES, required: true }
  },
  {
    _id: false
  }
);

const tenantSchema = new Schema<ITenant>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    businessName: { type: String, required: true, trim: true },
    businessType: {
      type: String,
      enum: TENANT_BUSINESS_TYPES,
      required: true
    },
    registrationDocumentUrls: {
      type: [String],
      default: []
    },
    subscriptionPlan: {
      type: subscriptionPlanSchema,
      required: true
    },
    subscriptionStatus: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "TRIAL"
    },
    shopsCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

tenantSchema.index({ ownerUserId: 1 }, { unique: true });
tenantSchema.index({ businessName: 1 });
tenantSchema.index({ subscriptionStatus: 1, isDeleted: 1 });

export const TenantModel = model<ITenant>("Tenant", tenantSchema);
