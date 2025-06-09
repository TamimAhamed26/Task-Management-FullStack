// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/entities/role.entity';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException('Access Denied: No role assigned.');
    }

    
    const hasRole = requiredRoles.some(role => role === user.role.toUpperCase());
    console.log('Logged in role',user.role,'.Sufficeient role',hasRole);
    if (!hasRole) {
      throw new ForbiddenException('Access Denied: Insufficient role.');
    }

    return true;
  }
}
