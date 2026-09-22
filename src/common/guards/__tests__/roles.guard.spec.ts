import {
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { IS_PUBLIC_KEY, Public } from 'src/common/decorators/public.decorator';
import { ROLES_KEY, Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { JwtPayload } from 'src/common/types/jwt-payload';

@Controller('class-roles')
@Roles('admin')
class ClassRolesController {
  @Get()
  handler() {
    return { ok: true };
  }
}

@Controller('roles-test')
class RolesTestController {
  @Get()
  @Roles('admin', 'user')
  handler() {
    return { ok: true };
  }
}

@Controller('public-test')
class PublicTestController {
  @Get()
  @Public()
  handler() {
    return { ok: true };
  }
}

const getClassHandler = (controllerClass: { prototype: object }) =>
  Object.getOwnPropertyDescriptor(controllerClass.prototype, 'handler')
    ?.value as object;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let warnSpy: jest.SpyInstance<void, [message: string]>;

  const createContext = (options: {
    handler?: object;
    controllerClass?: object;
    user?: JwtPayload;
    method?: string;
    path?: string;
    url?: string;
  }): ExecutionContext => {
    const handler = options.handler ?? jest.fn();
    const controllerClass = options.controllerClass ?? class {};

    return {
      getHandler: () => handler,
      getClass: () => controllerClass,
      switchToHttp: () => ({
        getRequest: () => ({
          user: options.user,
          method: options.method ?? 'GET',
          route: options.path ? { path: options.path } : undefined,
          url: options.url ?? options.path ?? '/test',
        }),
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get(RolesGuard);
    reflector = module.get(Reflector);
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('permite rota sem @Roles() com usuário autenticado', () => {
    const context = createContext({
      user: {
        sub: '1',
        email: 'usuario@example.com',
        role: 'user',
        mustChangePassword: false,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite rota @Roles("admin") com role admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) {
        return ['admin'];
      }
      return undefined;
    });

    const context = createContext({
      user: {
        sub: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        mustChangePassword: false,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lança ForbiddenException (403) para role user em rota de admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) {
        return ['admin'];
      }
      return undefined;
    });

    const context = createContext({
      user: {
        sub: 'user-1',
        email: 'usuario@example.com',
        role: 'user',
        mustChangePassword: false,
      },
      method: 'GET',
      path: '/admin',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Acesso negado para este papel',
    );
  });

  it('não bloqueia rota @Public() mesmo sem request.user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) {
        return true;
      }
      if (key === ROLES_KEY) {
        return ['admin'];
      }
      return undefined;
    });

    const context = createContext({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it('aplica @Roles declarado na classe a todos os handlers', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) {
        return ['admin'];
      }
      return undefined;
    });

    const context = createContext({
      handler: getClassHandler(ClassRolesController),
      controllerClass: ClassRolesController,
      user: {
        sub: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        mustChangePassword: false,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('emite log warn na recusa sem incluir token nem senha', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) {
        return ['admin'];
      }
      return undefined;
    });

    const context = createContext({
      user: {
        sub: 'user-1',
        email: 'usuario@example.com',
        role: 'user',
        mustChangePassword: false,
      },
      method: 'GET',
      path: '/admin-only',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [logMessage] = warnSpy.mock.calls[0] ?? [];
    expect(String(logMessage)).toContain('userId=user-1');
    expect(String(logMessage)).toContain('rota=GET /admin-only');
    expect(String(logMessage)).not.toMatch(/Bearer|senha|password|token/i);
  });
});

describe('Roles decorator', () => {
  it('grava metadados de papéis no handler', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      getClassHandler(RolesTestController),
    ) as Array<'admin' | 'user'> | undefined;

    expect(roles).toEqual(['admin', 'user']);
  });

  it('espelha o padrão de @Public()', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      getClassHandler(PublicTestController),
    ) as boolean | undefined;

    expect(isPublic).toBe(true);
  });
});
