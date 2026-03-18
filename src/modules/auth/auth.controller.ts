import { CookieOptions, Request, Response } from "express";

import { ApiError } from "../../core/utils/api-error";
import { authService } from "./auth.service";
import {
  loginSchema,
  requestOtpSchema,
  registerLeadCaptureSchema,
  registerLeadV2Schema,
  registerLeadSchema,
  verifyOtpSchema
} from "./auth.validation";

const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/"
};

const setAuthCookies = (
  res: Response,
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
  }
) => {
  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: tokens.accessTokenExpiresIn * 1000
  });
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: tokens.refreshTokenExpiresIn * 1000
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE_NAME, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);
};

export const authController = {
  async requestTrackingOtp(req: Request, res: Response) {
    const normalizedBody = {
      ...req.body,
      applicationId:
        req.body.applicationId ?? req.body.ApplicationID ?? req.body.requestId
    };

    const payload = requestOtpSchema.parse(normalizedBody);
    const data = await authService.requestTrackingOtp(payload);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data
    });
  },

  async verifyTrackingOtp(req: Request, res: Response) {
    const normalizedBody = {
      ...req.body,
      applicationId:
        req.body.applicationId ?? req.body.ApplicationID ?? req.body.requestId
    };

    const payload = verifyOtpSchema.parse(normalizedBody);
    const data = await authService.verifyTrackingOtp(payload);

    res.cookie("lead_tracking_token", data.token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 3 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        applicationId: data.applicationId,
        expiresIn: data.expiresIn
      }
    });
  },

  async registerLead(req: Request, res: Response) {
    const hasLeadCaptureV2Shape =
      typeof req.body === "object" &&
      req.body !== null &&
      ("ownerDetail" in req.body || "shops" in req.body);

    if (hasLeadCaptureV2Shape) {
      const payload = registerLeadV2Schema.parse(req.body);
      const data = await authService.registerLeadCaptureV2(payload);

      res.status(201).json({
        success: true,
        message: "Lead payload stored successfully",
        data
      });
      return;
    }

    const hasLeadCaptureShape =
      typeof req.body === "object" &&
      req.body !== null &&
      ("fullName" in req.body || "uploadedDocuments" in req.body);

    if (hasLeadCaptureShape) {
      const capturePayload = registerLeadCaptureSchema.parse(req.body);
      const captureData = await authService.registerLeadCapture(capturePayload);

      res.status(201).json({
        success: true,
        message: "Lead payload stored successfully",
        data: captureData
      });
      return;
    }

    const normalizedBody = {
      ...req.body,
      documentUrls: req.body.documentUrls ?? req.body.documentUrl
    };

    const payload = registerLeadSchema.parse(normalizedBody);
    const data = await authService.registerLead(payload);
    const message =
      data.email?.sent === false
        ? "Lead registered successfully, but welcome email could not be sent"
        : "Lead registered successfully";

    res.status(201).json({
      success: true,
      message,
      data
    });
  },

  async uploadRegisterDocuments(req: Request, res: Response) {
    let uploadFiles: Array<{
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }> = [];

    if (Array.isArray(req.files)) {
      uploadFiles = req.files;
    } else if (req.files && typeof req.files === "object") {
      uploadFiles = Object.values(req.files).flat();
    } else if (req.file) {
      uploadFiles = [req.file];
    }

    if (uploadFiles.length === 0) {
      throw new ApiError(400, "At least one document file is required");
    }

    const data = await authService.uploadRegisterDocuments(uploadFiles);

    res.status(201).json({
      success: true,
      message: "Documents uploaded successfully",
      data
    });
  },

  async login(req: Request, res: Response) {
    const payload = loginSchema.parse(req.body);
    const data = await authService.login(payload);
    setAuthCookies(res, data);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: data.user
      }
    });
  },

  async refreshSession(req: Request, res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken || typeof refreshToken !== "string") {
      throw new ApiError(401, "Refresh token is required");
    }

    const data = await authService.refreshSession({
      refreshToken
    });

    setAuthCookies(res, data);

    res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      data: {
        user: data.user
      }
    });
  },

  async logout(req: Request, res: Response) {
    const refreshToken =
      typeof req.cookies?.[REFRESH_COOKIE_NAME] === "string"
        ? req.cookies[REFRESH_COOKIE_NAME]
        : undefined;

    await authService.logoutSession({ refreshToken });
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  },

  async getMe(req: Request, res: Response) {
    if (!req.user) {
      throw new ApiError(401, "Authentication is required");
    }

    const data = await authService.getMe(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Current user fetched successfully",
      data
    });
  }
};
