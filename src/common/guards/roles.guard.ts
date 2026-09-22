import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request';
import type { UserRole } from 'src/modules/users/schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.user?.role;

    if (userRole && requiredRoles.includes(userRole)) {
      return true;
    }

    const userId = request.user?.sub ?? 'desconhecido';
    const method = request.method;
    const routePath = request.route as { path?: string } | undefined;
    const path = routePath?.path ?? request.url;

    this.logger.warn(
      `Acesso negado por papel: userId=${userId} rota=${method} ${path} papel=${userRole ?? 'ausente'} requerido=${requiredRoles.join(',')}`,
    );

    throw new ForbiddenException('Acesso negado para este papel');
  }
}
