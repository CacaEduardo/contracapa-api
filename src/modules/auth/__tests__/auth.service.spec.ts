import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { AuthService } from 'src/modules/auth/auth.service';
import { GoogleIdentityService } from 'src/modules/auth/google-identity.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { MailService } from 'src/modules/mail/mail.service';
import { UsersService } from 'src/modules/users/users.service';
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';
import { UserDocument } from 'src/modules/users/schemas/user.schema';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('node:crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('token-fixo')),
  createHash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmailWithPassword: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByIdWithPassword: jest.fn(),
    findByValidResetToken: jest.fn(),
    setPassword: jest.fn(),
    setPasswordResetToken: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findByGoogleId: jest.fn(),
    linkGoogleAccount: jest.fn(),
  };

  const mockCategoriesService = {
    existsAllSlugs: jest.fn(),
  };

  const mockWishlistsService = {
    ensureDefault: jest.fn(),
  };

  const mockGoogleIdentityService = {
    verify: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockMailService = {
    sendPasswordReset: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn(() => 'https://contracapa.com'),
  };

  const userWithPassword = {
    _id: { toString: () => '1' },
    name: 'Usuário Teste',
    email: 'teste@example.com',
    password: 'hashed',
    role: 'user',
    active: true,
    mustChangePassword: false,
  } as unknown as UserDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: WishlistsService, useValue: mockWishlistsService },
        {
          provide: GoogleIdentityService,
          useValue: mockGoogleIdentityService,
        },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();

    (createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('hash-fixo'),
    });
  });

  describe('signIn', () => {
    it('deve autenticar e retornar usuário público com token', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(
        userWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token.jwt.valido');

      const result = await service.signIn({
        email: 'teste@example.com',
        password: 'senha123',
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'teste@example.com',
        role: 'user',
        mustChangePassword: false,
      });
      expect(result.token).toBe('token.jwt.valido');
      expect(result.user).toEqual({
        _id: '1',
        name: 'Usuário Teste',
        email: 'teste@example.com',
        avatarUrl: undefined,
        role: 'user',
        active: true,
        mustChangePassword: false,
        company: undefined,
        favoriteCategorySlugs: [],
        authProvider: 'password',
        onboardingCompleted: true,
        createdAt: undefined,
        updatedAt: undefined,
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('deve orientar o login com Google quando a conta não tem senha', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue({
        ...userWithPassword,
        password: undefined,
        authProvider: 'google',
      });

      await expect(
        service.signIn({ email: 'teste@example.com', password: 'senha123' }),
      ).rejects.toMatchObject({
        response: { message: 'Esta conta usa login com Google' },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se o usuário não existir', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.signIn({
          email: 'ausente@example.com',
          password: 'senha123',
        }),
      ).rejects.toMatchObject({
        response: { message: 'Credenciais incorretas' },
      });
    });

    it('deve lançar UnauthorizedException se a senha estiver errada', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(
        userWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signIn({
          email: 'teste@example.com',
          password: 'errada',
        }),
      ).rejects.toMatchObject({
        response: { message: 'Credenciais incorretas' },
      });
    });

    it('deve lançar UnauthorizedException se a conta estiver desativada com mensagem genérica', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue({
        ...userWithPassword,
        active: false,
      });

      let inactiveError: UnauthorizedException | undefined;

      try {
        await service.signIn({
          email: 'teste@example.com',
          password: 'senha123',
        });
      } catch (error) {
        inactiveError = error as UnauthorizedException;
      }

      let notFoundError: UnauthorizedException | undefined;

      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      try {
        await service.signIn({
          email: 'ausente@example.com',
          password: 'senha123',
        });
      } catch (error) {
        notFoundError = error as UnauthorizedException;
      }

      expect(inactiveError?.message).toBe('Credenciais incorretas');
      expect(notFoundError?.message).toBe('Credenciais incorretas');
      expect(inactiveError?.message).toBe(notFoundError?.message);
    });
  });

  describe('signUp', () => {
    const signUpDto = {
      name: 'Ana Silva',
      email: 'ana@example.com',
      password: 'senha1234',
      company: 'Editora X',
      favoriteCategorySlugs: ['ficcao'],
    };

    const createdUser = {
      _id: '2',
      name: 'Ana Silva',
      email: 'ana@example.com',
      role: 'user',
      active: true,
      mustChangePassword: false,
      favoriteCategorySlugs: ['ficcao'],
      authProvider: 'password',
      onboardingCompleted: true,
    };

    it('deve criar leitor, a lista padrão e devolver token', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue([]);
      mockUsersService.create.mockResolvedValue(createdUser);
      mockJwtService.sign.mockReturnValue('token.novo');

      const result = await service.signUp(signUpDto);

      expect(mockUsersService.create).toHaveBeenCalledWith({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'senha1234',
        company: 'Editora X',
        favoriteCategorySlugs: ['ficcao'],
        role: 'user',
        authProvider: 'password',
        onboardingCompleted: true,
      });
      expect(mockWishlistsService.ensureDefault).toHaveBeenCalledWith('2');
      expect(result).toEqual({ user: createdUser, token: 'token.novo' });
    });

    it('deve recusar categorias inexistentes sem criar o usuário', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue(['inexistente']);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('deve propagar o 409 de e-mail já cadastrado', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue([]);
      mockUsersService.create.mockRejectedValue(
        new ConflictException('Já existe um usuário com este e-mail'),
      );

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockWishlistsService.ensureDefault).not.toHaveBeenCalled();
    });
  });

  describe('signInWithGoogle', () => {
    const profile = {
      googleId: 'google-1',
      email: 'ana@example.com',
      name: 'Ana Silva',
      picture: 'https://lh3.googleusercontent.com/a/foto',
    };

    beforeEach(() => {
      mockGoogleIdentityService.verify.mockResolvedValue(profile);
      mockJwtService.sign.mockReturnValue('token.google');
    });

    it('deve entrar com a conta já vinculada ao Google', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(userWithPassword);

      const result = await service.signInWithGoogle({ idToken: 'id-token' });

      expect(mockGoogleIdentityService.verify).toHaveBeenCalledWith('id-token');
      expect(mockUsersService.create).not.toHaveBeenCalled();
      expect(result.token).toBe('token.google');
      expect(result.user._id).toBe('1');
    });

    it('deve vincular o Google a uma conta existente com o mesmo e-mail', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(userWithPassword);
      mockUsersService.linkGoogleAccount.mockResolvedValue(userWithPassword);

      await service.signInWithGoogle({ idToken: 'id-token' });

      expect(mockUsersService.linkGoogleAccount).toHaveBeenCalledWith(
        '1',
        'google-1',
        profile.picture,
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('deve criar conta Google com onboarding pendente e lista padrão', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        _id: '3',
        email: 'ana@example.com',
        role: 'user',
        active: true,
        mustChangePassword: false,
        onboardingCompleted: false,
      });

      const result = await service.signInWithGoogle({ idToken: 'id-token' });

      expect(mockUsersService.create).toHaveBeenCalledWith({
        name: 'Ana Silva',
        email: 'ana@example.com',
        avatarUrl: profile.picture,
        googleId: 'google-1',
        role: 'user',
        authProvider: 'google',
        onboardingCompleted: false,
      });
      expect(mockWishlistsService.ensureDefault).toHaveBeenCalledWith('3');
      expect(result.user.onboardingCompleted).toBe(false);
    });

    it('deve recusar conta desativada', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue({
        ...userWithPassword,
        active: false,
      });

      await expect(
        service.signInWithGoogle({ idToken: 'id-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('deve retornar role e mustChangePassword do usuário persistido', async () => {
      mockUsersService.findById.mockResolvedValue({
        ...userWithPassword,
        mustChangePassword: true,
      });

      const result = await service.getMe({
        sub: '1',
        email: 'teste@example.com',
        role: 'user',
        mustChangePassword: false,
      });

      expect(mockUsersService.findById).toHaveBeenCalledWith('1');
      expect(result.role).toBe('user');
      expect(result.mustChangePassword).toBe(true);
      expect(result).not.toHaveProperty('password');
    });

    it('deve lançar UnauthorizedException se o usuário do token não existir', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.getMe({
          sub: '1',
          email: 'teste@example.com',
          role: 'user',
          mustChangePassword: false,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateProfile', () => {
    const jwtPayload = {
      sub: '1',
      email: 'teste@example.com',
      role: 'admin' as const,
      mustChangePassword: false,
    };

    it('deve atualizar dados, favoritos e concluir o onboarding', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue([]);
      mockUsersService.update.mockResolvedValue({ _id: '1' });

      await service.updateProfile(jwtPayload, {
        company: 'Editora X',
        favoriteCategorySlugs: ['ficcao'],
        onboardingCompleted: true,
      });

      expect(mockCategoriesService.existsAllSlugs).toHaveBeenCalledWith([
        'ficcao',
      ]);
      expect(mockUsersService.update).toHaveBeenCalledWith('1', {
        company: 'Editora X',
        favoriteCategorySlugs: ['ficcao'],
        onboardingCompleted: true,
      });
    });

    it('deve recusar favoritos com categoria inexistente', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue(['nada']);

      await expect(
        service.updateProfile(jwtPayload, { favoriteCategorySlugs: ['nada'] }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('deve atualizar apenas o nome do próprio usuário', async () => {
      const updated = {
        _id: '1',
        name: 'Ana Silva',
        email: 'teste@example.com',
        role: 'admin',
        active: true,
        mustChangePassword: false,
      };
      mockUsersService.update.mockResolvedValue(updated);

      const result = await service.updateProfile(jwtPayload, {
        name: 'Ana Silva',
      });

      expect(mockUsersService.update).toHaveBeenCalledWith('1', {
        name: 'Ana Silva',
      });
      expect(result).toEqual(updated);
      expect(result).not.toHaveProperty('password');
    });

    it('deve propagar erro quando o usuário não existe', async () => {
      mockUsersService.update.mockRejectedValue(
        new UnauthorizedException('Usuário não encontrado'),
      );

      await expect(
        service.updateProfile(jwtPayload, { name: 'Outro nome' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    const jwtPayload = {
      sub: '1',
      email: 'teste@example.com',
      role: 'user' as const,
      mustChangePassword: true,
    };

    it('deve lançar UnauthorizedException se o usuário não tiver senha persistida', async () => {
      mockUsersService.findByIdWithPassword.mockResolvedValue(null);

      await expect(
        service.changePassword(jwtPayload, {
          currentPassword: 'atual',
          newPassword: 'novaSenha123',
        }),
      ).rejects.toMatchObject({
        response: { message: 'Credenciais incorretas' },
      });

      expect(mockUsersService.setPassword).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se a senha atual estiver incorreta e não alterar a senha', async () => {
      mockUsersService.findByIdWithPassword.mockResolvedValue(userWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(jwtPayload, {
          currentPassword: 'errada',
          newPassword: 'novaSenha123',
        }),
      ).rejects.toMatchObject({
        response: { message: 'Credenciais incorretas' },
      });

      expect(mockUsersService.setPassword).not.toHaveBeenCalled();
    });

    it('deve gravar nova senha, zerar mustChangePassword e devolver token novo', async () => {
      mockUsersService.findByIdWithPassword.mockResolvedValue({
        ...userWithPassword,
        mustChangePassword: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.setPassword.mockResolvedValue({
        _id: '1',
        name: 'Usuário Teste',
        email: 'teste@example.com',
        role: 'user',
        active: true,
        mustChangePassword: false,
      });
      mockJwtService.sign.mockImplementation(
        (payload: { mustChangePassword: boolean }) =>
          payload.mustChangePassword ? 'token.antigo' : 'token.novo',
      );

      const result = await service.changePassword(jwtPayload, {
        currentPassword: 'senhaAtual',
        newPassword: 'novaSenha123',
      });

      expect(mockUsersService.setPassword).toHaveBeenCalledWith(
        '1',
        'novaSenha123',
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'teste@example.com',
        role: 'user',
        mustChangePassword: false,
      });
      expect(result.token).toBe('token.novo');
      expect(result.user.mustChangePassword).toBe(false);
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).not.toBe('token.antigo');
    });

    it('deve registrar o evento de troca de senha em log com userId', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      mockUsersService.findByIdWithPassword.mockResolvedValue({
        ...userWithPassword,
        mustChangePassword: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.setPassword.mockResolvedValue({
        _id: '1',
        name: 'Usuário Teste',
        email: 'teste@example.com',
        role: 'user',
        active: true,
        mustChangePassword: false,
      });
      mockJwtService.sign.mockReturnValue('token.novo');

      await service.changePassword(jwtPayload, {
        currentPassword: 'senhaAtual',
        newPassword: 'novaSenha123',
      });

      expect(logSpy).toHaveBeenCalledWith('Senha alterada: userId=1');
      logSpy.mockRestore();
    });
  });

  describe('forgotPassword', () => {
    it('deve devolver mensagem genérica mesmo quando o e-mail não existir', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'ausente@example.com',
      });

      expect(result.message).toContain('Se este e-mail estiver cadastrado');
      expect(mockUsersService.setPasswordResetToken).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('deve gerar token, persistir o hash e enviar o e-mail quando o usuário existir', async () => {
      mockUsersService.findByEmail.mockResolvedValue(userWithPassword);

      const result = await service.forgotPassword({
        email: 'teste@example.com',
      });

      expect(mockUsersService.setPasswordResetToken).toHaveBeenCalledWith(
        '1',
        'hash-fixo',
        expect.any(Date),
      );
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(
        'teste@example.com',
        expect.stringContaining(
          'https://contracapa.com/redefinir-senha?token=',
        ),
      );
      expect(result.message).toContain('Se este e-mail estiver cadastrado');
    });

    it('não deve lançar quando o envio do e-mail falhar', async () => {
      mockUsersService.findByEmail.mockResolvedValue(userWithPassword);
      mockMailService.sendPasswordReset.mockRejectedValue(
        new Error('falha no provedor'),
      );

      const result = await service.forgotPassword({
        email: 'teste@example.com',
      });

      expect(result.message).toContain('Se este e-mail estiver cadastrado');
    });
  });

  describe('resetPassword', () => {
    it('deve lançar UnauthorizedException quando o token for inválido ou expirado', async () => {
      mockUsersService.findByValidResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalido',
          newPassword: 'novaSenha123',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.setPassword).not.toHaveBeenCalled();
    });

    it('deve redefinir a senha do usuário do token', async () => {
      mockUsersService.findByValidResetToken.mockResolvedValue(
        userWithPassword,
      );
      mockUsersService.setPassword.mockResolvedValue({
        _id: '1',
        name: 'Usuário Teste',
        email: 'teste@example.com',
        role: 'user',
        active: true,
        mustChangePassword: false,
      });

      const result = await service.resetPassword({
        token: 'valido',
        newPassword: 'novaSenha123',
      });

      expect(mockUsersService.setPassword).toHaveBeenCalledWith(
        '1',
        'novaSenha123',
      );
      expect(result.user.mustChangePassword).toBe(false);
    });
  });
});
