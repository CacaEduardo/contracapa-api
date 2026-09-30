import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { Env } from 'src/config/env.schema';

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};

const INVALID_GOOGLE_TOKEN_MESSAGE =
  'Não foi possível validar o login com Google';

@Injectable()
export class GoogleIdentityService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService<Env, true>) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });

    if (!clientId) {
      throw new ServiceUnavailableException(
        'Login com Google não está configurado',
      );
    }

    const ticket = await this.client
      .verifyIdToken({ idToken, audience: clientId })
      .catch(() => {
        throw new UnauthorizedException(INVALID_GOOGLE_TOKEN_MESSAGE);
      });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name ?? payload.email,
      picture: payload.picture,
    };
  }
}
