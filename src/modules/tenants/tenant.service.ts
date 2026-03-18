import { Types } from "mongoose";

import { ApiError } from "../../core/utils/api-error";
import { TenantModel } from "./tenant.model";

export const tenantService = {
  async listTenants() {
    const tenants = await TenantModel.find({ isDeleted: false })
      .populate("ownerUserId", "name email role")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return tenants;
  },

  async updateSubscriptionStatus(tenantId: Types.ObjectId, subscriptionStatus: string) {
    const tenant = await TenantModel.findOneAndUpdate(
      { _id: tenantId, isDeleted: false },
      { subscriptionStatus },
      { new: true }
    )
      .lean()
      .exec();

    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }

    return tenant;
  },

  async incrementShopsCount(tenantId: Types.ObjectId) {
    await TenantModel.updateOne(
      { _id: tenantId, isDeleted: false },
      { $inc: { shopsCount: 1 } }
    ).exec();
  }
};

