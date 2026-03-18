import { Router } from "express";

import { asyncHandler } from "../../core/utils/async-handler";
import { requireAuth, requireRoles } from "../auth/auth.middleware";
import { usertypeController } from "./usertype.controller";

const usertypeRouter = Router();

const superAdminRouter = Router();
superAdminRouter.use(requireAuth, requireRoles("SUPER_ADMIN"));
superAdminRouter.get("/tenants", asyncHandler(usertypeController.superAdminListTenants));
superAdminRouter.patch(
  "/tenants/:tenantId/subscription-status",
  asyncHandler(usertypeController.superAdminUpdateTenantSubscription)
);
superAdminRouter.get("/users", asyncHandler(usertypeController.superAdminListUsers));
superAdminRouter.get(
  "/registration-leads",
  asyncHandler(usertypeController.superAdminListRegistrationLeads)
);
superAdminRouter.get(
  "/registration-leads/:leadId",
  asyncHandler(usertypeController.superAdminGetRegistrationLead)
);
superAdminRouter.get(
  "/registration-leads/registration-leads/:leadId",
  asyncHandler(usertypeController.superAdminGetRegistrationLead)
);
superAdminRouter.patch(
  "/registration-leads/:leadId",
  asyncHandler(usertypeController.superAdminUpdateRegistrationLead)
);
superAdminRouter.patch(
  "/registration-leads/registration-leads/:leadId",
  asyncHandler(usertypeController.superAdminUpdateRegistrationLead)
);
superAdminRouter.post(
  "/registration-leads/:leadId/approveLeads",
  asyncHandler(usertypeController.superAdminApproveRegistrationLead)
);
superAdminRouter.patch(
  "/registration-leads/:leadId/approveLeads",
  asyncHandler(usertypeController.superAdminApproveRegistrationLead)
);
superAdminRouter.post(
  "/registration-leads/registration-leads/:leadId/approveLeads",
  asyncHandler(usertypeController.superAdminApproveRegistrationLead)
);
superAdminRouter.patch(
  "/registration-leads/registration-leads/:leadId/approveLeads",
  asyncHandler(usertypeController.superAdminApproveRegistrationLead)
);
superAdminRouter.delete(
  "/registration-leads/:leadId",
  asyncHandler(usertypeController.superAdminDeleteRegistrationLead)
);

const adminRouter = Router();
adminRouter.use(requireAuth, requireRoles("ADMIN"));
adminRouter.post("/shops", asyncHandler(usertypeController.adminCreateShop));
adminRouter.get("/shops", asyncHandler(usertypeController.adminListShops));
adminRouter.post("/users", asyncHandler(usertypeController.adminCreateTeamUser));
adminRouter.get("/users", asyncHandler(usertypeController.adminListTeamUsers));

const managerRouter = Router();
managerRouter.use(requireAuth, requireRoles("MANAGER"));
managerRouter.post("/staff", asyncHandler(usertypeController.managerCreateStaff));
managerRouter.get("/staff", asyncHandler(usertypeController.managerListStaff));

const staffRouter = Router();
staffRouter.use(requireAuth, requireRoles("STAFF"));
staffRouter.get("/profile", asyncHandler(usertypeController.staffProfile));

const customerRouter = Router();
customerRouter.use(requireAuth, requireRoles("CUSTOMER"));
customerRouter.get("/profile", asyncHandler(usertypeController.customerProfile));
customerRouter.get("/shops", asyncHandler(usertypeController.customerBrowseShops));

usertypeRouter.use("/superadmin", superAdminRouter);
usertypeRouter.use("/admin", adminRouter);
usertypeRouter.use("/manager", managerRouter);
usertypeRouter.use("/staff", staffRouter);
usertypeRouter.use("/customer", customerRouter);

export { usertypeRouter };
