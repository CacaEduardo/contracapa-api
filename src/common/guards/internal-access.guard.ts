import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Env } from 'src/config/env.schema';
import {
  INTERNAL_TOKEN_HEADER,
  internalTokensMatch,
  isOriginAllowed,
  parseAllowedOrigins,
  resolveRequestOrigin,
} from 'src/common/lib/internal-access';

@Injectable()
export class InternalAccessGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedToken = this.config.get('INTERNAL_TOKEN', { infer: true });
    const allowedOrigins = parseAllowedOrigins(
      this.config.get('ALLOWED_ORIGINS', { infer: true }),
    );

    const headerToken = request.headers[INTERNAL_TOKEN_HEADER];
    const providedToken = Array.isArray(headerToken)
      ? headerToken[0]
      : headerToken;

    if (internalTokensMatch(providedToken, expectedToken)) {
      return true;
    }

    const origin = resolveRequestOrigin(
      request.headers.origin,
      request.headers.referer,
    );

    if (isOriginAllowed(origin, allowedOrigins)) {
      return true;
    }

    throw new ForbiddenException('Origem não autorizada');
  }
}
