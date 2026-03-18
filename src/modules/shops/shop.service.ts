import { Types } from "mongoose";

import { ApiError } from "../../core/utils/api-error";
import { tenantService } from "../tenants/tenant.service";
import { ShopModel } from "./shop.model";

interface CreateShopInput {
  tenantId: Types.ObjectId;
  name: string;
  code?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  phone?: string;
  email?: string;
  managerId?: Types.ObjectId;
  openingHours?: {
    openingTime?: string;
    closingTime?: string;
  };
  gstNumber?: string;
  createdBy: Types.ObjectId;
}

const hasDuplicateKeyError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  return (error as { code?: number }).code === 11000;
};

export const shopService = {
  async createShop(input: CreateShopInput) {
    try {
      const shop = await ShopModel.create({
        tenantId: input.tenantId,
        name: input.name,
        code: input.code,
        address: input.address,
        phone: input.phone,
        email: input.email,
        managerId: input.managerId,
        openingHours: input.openingHours,
        gstNumber: input.gstNumber,
        createdBy: input.createdBy,
        updatedBy: input.createdBy
      });

      await tenantService.incrementShopsCount(input.tenantId);

      return shop;
    } catch (error) {
      if (hasDuplicateKeyError(error)) {
        throw new ApiError(409, "Shop code already exists for this tenant");
      }

      throw error;
    }
  },

  async listTenantShops(tenantId: Types.ObjectId) {
    return ShopModel.find({
      tenantId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  },

  async listActiveShops() {
    return ShopModel.find({
      isDeleted: false,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  },

  async ensureShopBelongsToTenant(shopId: Types.ObjectId, tenantId: Types.ObjectId) {
    const shop = await ShopModel.findOne({
      _id: shopId,
      tenantId,
      isDeleted: false
    }).exec();

    if (!shop) {
      throw new ApiError(404, "Shop not found for the tenant");
    }

    return shop;
  }
};

