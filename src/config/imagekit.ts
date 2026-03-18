import ImageKit from "@imagekit/nodejs";

import { env } from "./env";

export const imagekit = new ImageKit({
  privateKey: env.IMAGEKIT_PRIVATE_KEY
});

export const imagekitPublicConfig = {
  publicKey: env.IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT
} as const;
