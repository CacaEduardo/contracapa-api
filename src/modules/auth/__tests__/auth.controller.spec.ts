import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { JwtPayload } from 'src/common/types/jwt-payload';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    signIn: jest.fn(),
    getMe: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('deve chamar signIn e retornar usuário e token', async () => {
      const dto = { email: 'teste@example.com', password: 'senha123' };
      const mockResponse = {
        user: {
          _id: '1',
          name: 'Usuário Teste',
          email: 'teste@example.com',
        },
        token: 'token.jwt.valido',
      };

      mockAuthService.signIn.mockResolvedValue(mockResponse);

      const result = await controller.signIn(dto);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
      expect(result).not.toHaveProperty('success');
    });

    it('deve propagar UnauthorizedException quando as credenciais falham', async () => {
      mockAuthService.signIn.mockRejectedValue(
        new UnauthorizedException('Credenciais incorretas'),
      );

      await expect(
        controller.signIn({
          email: 'teste@example.com',
          password: 'errada',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('deve chamar getMe com o payload JWT', async () => {
      const payload: JwtPayload = {
        sub: '1',
        email: 'teste@example.com',
        role: 'user',
        mustChangePassword: false,
      };
      const mockUser = {
        _id: '1',
        name: 'Usuário Teste',
        email: 'teste@example.com',
      };

      mockAuthService.getMe.mockResolvedValue(mockUser);

      const result = await controller.getMe(payload);

      expect(mockAuthService.getMe).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('deve chamar updateProfile com payload e corpo', async () => {
      const payload: JwtPayload = {
        sub: '1',
        email: 'teste@example.com',
        role: 'admin',
        mustChangePassword: false,
      };
      const dto = { name: 'Ana Silva' };
      const mockUser = {
        _id: '1',
        name: 'Ana Silva',
        email: 'teste@example.com',
        role: 'admin',
        active: true,
        mustChangePassword: false,
      };

      mockAuthService.updateProfile.mockResolvedValue(mockUser);

      const result = await controller.updateProfile(payload, dto);

      expect(mockAuthService.updateProfile).toHaveBeenCalledWith(payload, dto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('changePassword', () => {
    it('deve chamar changePassword com payload e corpo', async () => {
      const payload: JwtPayload = {
        sub: '1',
        email: 'teste@example.com',
        role: 'user',
        mustChangePassword: true,
      };
      const dto = {
        currentPassword: 'senhaAtual',
        newPassword: 'novaSenha123',
      };
      const mockResponse = {
        user: {
          _id: '1',
          name: 'Usuário Teste',
          email: 'teste@example.com',
          role: 'user',
          active: true,
          mustChangePassword: false,
        },
        token: 'token.novo',
      };

      mockAuthService.changePassword.mockResolvedValue(mockResponse);

      const result = await controller.changePassword(payload, dto);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(payload, dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('forgotPassword', () => {
    it('deve chamar forgotPassword via service', async () => {
      const dto = { email: 'teste@example.com' };
      const response = { message: 'Se este e-mail estiver cadastrado...' };
      mockAuthService.forgotPassword.mockResolvedValue(response);

      const result = await controller.forgotPassword(dto);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });
  });

  describe('resetPassword', () => {
    it('deve chamar resetPassword via service', async () => {
      const dto = { token: 'abc', newPassword: 'novaSenha123' };
      const response = {
        user: { _id: '1', name: 'Usuário Teste', email: 'teste@example.com' },
      };
      mockAuthService.resetPassword.mockResolvedValue(response);

      const result = await controller.resetPassword(dto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });
  });
});
