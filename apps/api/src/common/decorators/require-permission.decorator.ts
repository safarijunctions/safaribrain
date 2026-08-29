import { SetMetadata } from "@nestjs/common";
import { Permission } from "@safaribrain/shared";

// Scoped permission grants layered on top of role — §3: refunds, payouts,
// bank-detail changes, fee publishing, and safety content need dual
// approval, not just "is this user an Admin".
export const PERMISSION_KEY = "permission";
export const RequirePermission = (permission: Permission) => SetMetadata(PERMISSION_KEY, permission);
