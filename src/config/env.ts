import dotenv from "dotenv";

dotenv.config();

type NodeEnv = "development" | "production" | "test";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const parsePort = (value: string): number => {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("Environment variable PORT must be a positive integer");
  }

  return port;
};

const parseNodeEnv = (value: string): NodeEnv => {
  if (value === "development" || value === "production" || value === "test") {
    return value;
  }

  throw new Error(
    "Environment variable NODE_ENV must be one of: development, production, test"
  );
};

export const env = {
  NODE_ENV: parseNodeEnv(getRequiredEnv("NODE_ENV")),
  PORT: parsePort(getRequiredEnv("PORT")),
  MONGODB_URI: getRequiredEnv("MONGODB_URI"),
  JWT_ACCESS_SECRET: getRequiredEnv("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: getRequiredEnv("JWT_REFRESH_SECRET"),
  CORS_ORIGIN: getRequiredEnv("CORS_ORIGIN"),
  IMAGEKIT_PUBLIC_KEY: getRequiredEnv("IMAGEKIT_PUBLIC_KEY"),
  IMAGEKIT_PRIVATE_KEY: getRequiredEnv("IMAGEKIT_PRIVATE_KEY"),
  IMAGEKIT_URL_ENDPOINT: getRequiredEnv("IMAGEKIT_URL_ENDPOINT"),
  RESEND_API_KEY: getRequiredEnv("RESEND_API_KEY"),
  EMAIL_FROM: getRequiredEnv("EMAIL_FROM")
} as const;
