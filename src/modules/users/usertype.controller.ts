import { Request, Response } from "express";
import { ApiError } from "../../core/utils/api-error";
import { toObjectId } from "../../core/utils/object-id";
import { registrationLeadService } from "../auth/registration-lead.service";
import {
  approveRegistrationLeadSchema,
  listRegistrationLeadsQuerySchema,
  reviewRegistrationLeadFieldSchema,
  updateRegistrationLeadSchema
} from "../auth/registration-lead.validation";
import { shopService } from "../shops/shop.service";
import { tenantService } from "../tenants/tenant.service";
import { userService } from "./user.service";
import { UserRole } from "./user.types";
import {
  createAdminTeamUserSchema,
  createManagerStaffSchema,
  createShopSchema,
  listUsersQuerySchema,
  updateSubscriptionStatusSchema
} from "./usertype.validation";

const getAuthUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication is required");
  }

  return req.user;
};

const getTenantIdFromAuth = (req: Request) => {
  const authUser = getAuthUser(req);
  if (!authUser.tenantId) {
    throw new ApiError(400, "Tenant context is missing in token");
  }

  return toObjectId(authUser.tenantId, "tenantId");
};

const getShopIdFromAuth = (req: Request) => {
  const authUser = getAuthUser(req);
  if (!authUser.shopId) {
    throw new ApiError(400, "Shop context is missing in token");
  }

  return toObjectId(authUser.shopId, "shopId");
};

export const usertypeController = {
  async superAdminListTenants(_req: Request, res: Response) {
    const data = await tenantService.listTenants();

    res.status(200).json({
      success: true,
      message: "Tenants fetched successfully",
      data
    });
  },

  async superAdminUpdateTenantSubscription(req: Request, res: Response) {
    const tenantIdParam = Array.isArray(req.params.tenantId)
      ? req.params.tenantId[0]
      : req.params.tenantId;

    if (!tenantIdParam) {
      throw new ApiError(400, "tenantId route parameter is required");
    }

    const tenantId = toObjectId(tenantIdParam, "tenantId");
    const payload = updateSubscriptionStatusSchema.parse(req.body);

    const data = await tenantService.updateSubscriptionStatus(
      tenantId,
      payload.subscriptionStatus
    );

    res.status(200).json({
      success: true,
      message: "Tenant subscription updated successfully",
      data
    });
  },

  async superAdminListUsers(req: Request, res: Response) {
    const query = listUsersQuerySchema.parse(req.query);
    const data = await userService.listGlobalUsers(query.role);

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data
    });
  },

  async superAdminListRegistrationLeads(req: Request, res: Response) {
    const query = listRegistrationLeadsQuerySchema.parse(req.query);
    const data = await registrationLeadService.listRegistrationLeads(query);

    res.status(200).json({
      success: true,
      message: "Registration leads fetched successfully",
      data
    });
  },

  async superAdminGetRegistrationLead(req: Request, res: Response) {
    const leadIdParam = Array.isArray(req.params.leadId)
      ? req.params.leadId[0]
      : req.params.leadId;

    if (!leadIdParam) {
      throw new ApiError(400, "leadId route parameter is required");
    }

    const data = await registrationLeadService.getRegistrationLead(leadIdParam);

    res.status(200).json({
      success: true,
      message: "Registration lead fetched successfully",
      data
    });
  },

  async superAdminUpdateRegistrationLead(req: Request, res: Response) {
    const authUser = getAuthUser(req);
    const leadIdParam = Array.isArray(req.params.leadId)
      ? req.params.leadId[0]
      : req.params.leadId;

    if (!leadIdParam) {
      throw new ApiError(400, "leadId route parameter is required");
    }

    const hasFieldReviewPayload =
      typeof req.body === "object" &&
      req.body !== null &&
      ("fieldKey" in req.body || "acceptStatus" in req.body || "action" in req.body);

    if (hasFieldReviewPayload) {
      const payload = reviewRegistrationLeadFieldSchema.parse(req.body);
      const data = await registrationLeadService.reviewRegistrationLeadField({
        leadIdentifier: leadIdParam,
        actorUserId: toObjectId(authUser.userId, "userId"),
        payload
      });

      res.status(200).json({
        success: true,
        message: "Registration lead review decision saved successfully",
        data
      });
      return;
    }

    const leadId = toObjectId(leadIdParam, "leadId");
    const payload = updateRegistrationLeadSchema.parse(req.body);
    const data = await registrationLeadService.updateRegistrationLead({
      leadId,
      actorUserId: toObjectId(authUser.userId, "userId"),
      payload
    });

    res.status(200).json({
      success: true,
      message: "Registration lead updated successfully",
      data
    });
  },

  async superAdminDeleteRegistrationLead(req: Request, res: Response) {
    const leadIdParam = Array.isArray(req.params.leadId)
      ? req.params.leadId[0]
      : req.params.leadId;

    if (!leadIdParam) {
      throw new ApiError(400, "leadId route parameter is required");
    }

    const leadId = toObjectId(leadIdParam, "leadId");
    const data = await registrationLeadService.deleteRegistrationLead(leadId);

    res.status(200).json({
      success: true,
      message: "Registration lead deleted successfully",
      data
    });
  },

  async superAdminApproveRegistrationLead(req: Request, res: Response) {
    const authUser = getAuthUser(req);
    const leadIdParam = Array.isArray(req.params.leadId)
      ? req.params.leadId[0]
      : req.params.leadId;

    if (!leadIdParam) {
      throw new ApiError(400, "leadId route parameter is required");
    }

    const payload = approveRegistrationLeadSchema.parse(req.body ?? {});
    const data = await registrationLeadService.approveRegistrationLead({
      leadIdentifier: leadIdParam,
      actorUserId: toObjectId(authUser.userId, "userId"),
      payload
    });

    res.status(200).json({
      success: true,
      message: "Lead approved and admin credentials generated successfully",
      data
    });
  },

  async adminCreateShop(req: Request, res: Response) {
    const payload = createShopSchema.parse(req.body);
    const authUser = getAuthUser(req);
    const tenantId = getTenantIdFromAuth(req);
    const createdBy = toObjectId(authUser.userId, "createdBy");

    const managerId = payload.managerId
      ? toObjectId(payload.managerId, "managerId")
      : undefined;

    const data = await shopService.createShop({
      tenantId,
      name: payload.name,
      code: payload.code,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      managerId,
      openingHours: payload.openingHours,
      gstNumber: payload.gstNumber,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: "Shop created successfully",
      data
    });
  },

  async adminListShops(req: Request, res: Response) {
    const tenantId = getTenantIdFromAuth(req);
    const data = await shopService.listTenantShops(tenantId);

    res.status(200).json({
      success: true,
      message: "Tenant shops fetched successfully",
      data
    });
  },

  async adminCreateTeamUser(req: Request, res: Response) {
    const authUser = getAuthUser(req);
    const tenantId = getTenantIdFromAuth(req);
    const payload = createAdminTeamUserSchema.parse(req.body);

    const shopId = payload.shopId
      ? toObjectId(payload.shopId, "shopId")
      : undefined;

    if (shopId) {
      await shopService.ensureShopBelongsToTenant(shopId, tenantId);
    }

    const data = await userService.createScopedUser({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      role: payload.role,
      tenantId,
      shopId,
      permissions: payload.permissions,
      createdBy: toObjectId(authUser.userId, "createdBy")
    });

    res.status(201).json({
      success: true,
      message: `${payload.role} user created successfully`,
      data
    });
  },

  async adminListTeamUsers(req: Request, res: Response) {
    const tenantId = getTenantIdFromAuth(req);

    const roleQuery = typeof req.query.role === "string" ? req.query.role : undefined;
    let roles: UserRole[] | undefined;
    if (roleQuery) {
      if (roleQuery === "MANAGER" || roleQuery === "STAFF") {
        roles = [roleQuery];
      }
    } else {
      roles = ["MANAGER", "STAFF"];
    }

    const data = await userService.listUsersByTenant({
      tenantId,
      roles
    });

    res.status(200).json({
      success: true,
      message: "Team users fetched successfully",
      data
    });
  },

  async managerCreateStaff(req: Request, res: Response) {
    const authUser = getAuthUser(req);
    const tenantId = getTenantIdFromAuth(req);
    const shopId = getShopIdFromAuth(req);
    const payload = createManagerStaffSchema.parse(req.body);

    const data = await userService.createScopedUser({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      role: "STAFF",
      tenantId,
      shopId,
      permissions: payload.permissions,
      createdBy: toObjectId(authUser.userId, "createdBy")
    });

    res.status(201).json({
      success: true,
      message: "Staff user created successfully",
      data
    });
  },

  async managerListStaff(req: Request, res: Response) {
    const tenantId = getTenantIdFromAuth(req);
    const shopId = getShopIdFromAuth(req);

    const data = await userService.listUsersByTenant({
      tenantId,
      shopId,
      roles: ["STAFF"]
    });

    res.status(200).json({
      success: true,
      message: "Shop staff fetched successfully",
      data
    });
  },

  async staffProfile(req: Request, res: Response) {
    const authUser = getAuthUser(req);
    const data = await userService.getUserProfile(
      toObjectId(authUser.userId, "userId")
    );

    res.status(200).json({
      success: true,
      message: "Staff profile fetched successfully",
      data
    });
  },

  async customerProfile(req: Request, res: Response) {
    const authUser = getAuthUser(req);
    const data = await userService.getUserProfile(
      toObjectId(authUser.userId, "userId")
    );

    res.status(200).json({
      success: true,
      message: "Customer profile fetched successfully",
      data
    });
  },

  async customerBrowseShops(_req: Request, res: Response) {
    const data = await shopService.listActiveShops();

    res.status(200).json({
      success: true,
      message: "Active shops fetched successfully",
      data
    });
  }
};
