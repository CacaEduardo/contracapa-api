import type { Request } from 'express';
import type { JwtPayload } from 'src/common/types/jwt-payload';

export type AuthenticatedRequest = Request & { user?: JwtPayload };
