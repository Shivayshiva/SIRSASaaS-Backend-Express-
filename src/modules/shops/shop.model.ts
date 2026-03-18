import { Schema, Types, model } from "mongoose";

interface ShopAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface OpeningHours {
  openingTime?: string;
  closingTime?: string;
}

export interface IShop {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  code?: string;
  address?: ShopAddress;
  phone?: string;
  email?: string;
  managerId?: Types.ObjectId;
  openingHours?: OpeningHours;
  gstNumber?: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shopAddressSchema = new Schema<ShopAddress>(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true }
  },
  {
    _id: false
  }
);

const openingHoursSchema = new Schema<OpeningHours>(
  {
    openingTime: { type: String, trim: true },
    closingTime: { type: String, trim: true }
  },
  {
    _id: false
  }
);

const shopSchema = new Schema<IShop>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    address: { type: shopAddressSchema },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    openingHours: { type: openingHoursSchema },
    gstNumber: { type: String, trim: true, uppercase: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

shopSchema.index({ tenantId: 1, name: 1, isDeleted: 1 });
shopSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $exists: true } } }
);
shopSchema.index({ tenantId: 1, managerId: 1, isDeleted: 1 });

export const ShopModel = model<IShop>("Shop", shopSchema);

