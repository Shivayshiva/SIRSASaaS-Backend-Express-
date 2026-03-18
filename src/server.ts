import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";

const bootstrap = async (): Promise<void> => {
  await connectDB();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server started");
  });
};

bootstrap().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to bootstrap server");
  process.exit(1);
});

