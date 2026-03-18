import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorMiddleware } from "./core/middlewares/error.middleware";
import { notFoundMiddleware } from "./core/middlewares/not-found.middleware";
import { router } from "./routes";

export const createApp = () => {
  const app = express();
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.disable("x-powered-by"); //By default, Express adds this header in every response: X-Powered-By: Express. Disabling it can help reduce the attack surface by not revealing the underlying technology.

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiLimiter);
  app.use(
    pinoHttp({
      logger
    })
  );

  app.use("/api/v1", router);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
