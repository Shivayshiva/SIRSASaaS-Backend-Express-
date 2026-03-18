import { UserRole } from "../users/user.types";

export interface AuthUserPayload {
  userId: string;
  role: UserRole;
  tenantId?: string;
  shopId?: string;
}

