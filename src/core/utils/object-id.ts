import { Types } from "mongoose";

import { ApiError } from "./api-error";

export const toObjectId = (value: string, fieldName: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${fieldName} must be a valid ObjectId`);
  }

  return new Types.ObjectId(value);
};

