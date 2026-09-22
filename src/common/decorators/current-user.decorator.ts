import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request';
import type { JwtPayload } from 'src/common/types/jwt-payload';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as JwtPayload;
  },
);
