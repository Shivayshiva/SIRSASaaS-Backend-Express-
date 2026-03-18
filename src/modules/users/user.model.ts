import { Schema, Types, model } from "mongoose";

import { USER_ROLES, USER_STATUSES, UserRole, UserStatus } from "./user.types";

interface Address {
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  refreshTokenHash?: string;
  refreshTokenExpiresAt?: Date;
  role: UserRole;
  tenantId?: Types.ObjectId;
  shopId?: Types.ObjectId;
  permissions: string[];
  address?: Address;
  status: UserStatus;
  lastLoginAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<Address>(
  {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    pincode: { type: String, trim: true }
  },
  {
    _id: false
  }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, trim: true },
    refreshTokenHash: { type: String, trim: true },
    refreshTokenExpiresAt: { type: Date },
    role: { type: String, enum: USER_ROLES, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop" },
    permissions: { type: [String], default: [] },
    address: { type: addressSchema },
    status: { type: String, enum: USER_STATUSES, default: "ACTIVE" },
    lastLoginAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, role: 1, isDeleted: 1 });
userSchema.index({ tenantId: 1, shopId: 1, role: 1, isDeleted: 1 });

export const UserModel = model<IUser>("User", userSchema);
