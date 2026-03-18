import { AuthUserPayload } from "../modules/auth/auth.types";

declare global {
  namespace AppTypes {
    interface UploadedFile {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }
  }

  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      file?: AppTypes.UploadedFile;
      files?: AppTypes.UploadedFile[] | Record<string, AppTypes.UploadedFile[]>;
    }
  }
}

export {};
