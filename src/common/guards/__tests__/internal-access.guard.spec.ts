import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalAccessGuard } from 'src/common/guards/internal-access.guard';
import { Env } from 'src/config/env.schema';

describe('InternalAccessGuard', () => {
  const INTERNAL_TOKEN = 'test-internal-token';
  const ALLOWED_ORIGINS = 'http://localhost:3000,https://carla.example';

  const buildContext = (headers: Record<string, string | undefined>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as never;

  const createGuard = async (env: Partial<Env> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalAccessGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (key: keyof Env) =>
              ({
                INTERNAL_TOKEN,
                ALLOWED_ORIGINS,
                ...env,
              })[key],
          },
        },
      ],
    }).compile();

    return module.get(InternalAccessGuard);
  };

  it('permite quando o X-Internal-Token coincide', async () => {
    const guard = await createGuard();

    expect(
      guard.canActivate(buildContext({ 'x-internal-token': INTERNAL_TOKEN })),
    ).toBe(true);
  });

  it('permite quando a Origin está na allowlist, sem token interno', async () => {
    const guard = await createGuard();

    expect(
      guard.canActivate(buildContext({ origin: 'http://localhost:3000' })),
    ).toBe(true);
  });

  it('permite Origin extraída do Referer', async () => {
    const guard = await createGuard();

    expect(
      guard.canActivate(
        buildContext({
          referer: 'https://carla.example/entrar',
        }),
      ),
    ).toBe(true);
  });

  it('recusa token errado e origem fora da lista', async () => {
    const guard = await createGuard();

    expect(() =>
      guard.canActivate(
        buildContext({
          'x-internal-token': 'outro-token',
          origin: 'https://evil.example',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('recusa request sem token e sem origem', async () => {
    const guard = await createGuard();

    expect(() => guard.canActivate(buildContext({}))).toThrow(
      ForbiddenException,
    );
  });
});
