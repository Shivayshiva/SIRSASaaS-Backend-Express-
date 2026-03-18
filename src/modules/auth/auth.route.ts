import { Router } from "express";
import multer from "multer";

import { ApiError } from "../../core/utils/api-error";
import { asyncHandler } from "../../core/utils/async-handler";
import { authController } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

const authRouter = Router();
const registerLeadBodyParser = multer().none();
const registerDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
      return;
    }

    callback(new ApiError(400, "Only image files are allowed"));
  }
});

authRouter.post(
  "/register/track/request-otp",
  registerLeadBodyParser,
  asyncHandler(authController.requestTrackingOtp)
);
authRouter.post(
  "/register/track/verify-otp",
  registerLeadBodyParser,
  asyncHandler(authController.verifyTrackingOtp)
);

authRouter.post(
  "/register/upload-docs",
  registerDocUpload.fields([
    { name: "file", maxCount: 10 },
    { name: "documents", maxCount: 10 },
    { name: "document", maxCount: 10 }
  ]),
  asyncHandler(authController.uploadRegisterDocuments)
);

authRouter.post(
  "/register",
  registerLeadBodyParser,
  asyncHandler(authController.registerLead)
);
authRouter.post("/login", asyncHandler(authController.login));
authRouter.post("/refresh", asyncHandler(authController.refreshSession));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.getMe));

export { authRouter };
