import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission, UserRole } from "@safaribrain/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";
import { JwtPayload } from "../../auth/jwt.strategy";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermission = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !requiredPermission) return true;

    const user: JwtPayload | undefined = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException("Not authenticated");

    if (requiredRoles && !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(", ")}`);
    }

    if (requiredPermission && !(user.permissions ?? []).includes(requiredPermission)) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
    }

    return true;
  }
}
