import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { compareSync } from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  compareSync: jest.fn(),
  hashSync: jest.fn(),
}));

jest.mock('nanoid/async', () => ({
  nanoid: jest.fn().mockResolvedValue('mock-nanoid'),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let authRepo: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let cacheManager: Record<string, jest.Mock>;

  beforeEach(async () => {
    authRepo = {
      getSessionInfo: jest.fn(),
      updateMetadata: jest.fn(),
      sendRecoveryMail: jest.fn(),
      resetPassword: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      decode: jest.fn(),
    };

    cacheManager = {
      set: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('validate', () => {
    const mockSessionData = {
      id: 1n,
      email: 'john@test.com',
      password: '$2a$10$hashedpassword',
      user: { id: 1n },
      type: { id: 1, name: 'Web' },
      rol: { id: 1, name: 'Super Admin' },
    };

    it('debería retornar información del usuario si el password coincide', async () => {
      authRepo.getSessionInfo.mockResolvedValue(mockSessionData);
      (compareSync as jest.Mock).mockReturnValue(true);

      const result = await authService.validate('john@test.com', 'Password123');

      expect(authRepo.getSessionInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'john@test.com' },
        }),
      );
      expect(compareSync).toHaveBeenCalledWith(
        'Password123',
        '$2a$10$hashedpassword',
      );
      expect(authRepo.updateMetadata).toHaveBeenCalledWith(1n);
      expect(result).toEqual({
        id: 1n,
        typeId: 1,
        rolId: 1,
      });
    });

    it('debería retornar null si el password no coincide', async () => {
      authRepo.getSessionInfo.mockResolvedValue(mockSessionData);
      (compareSync as jest.Mock).mockReturnValue(false);

      const result = await authService.validate('john@test.com', 'wrong');

      expect(result).toBeNull();
    });

    it('debería retornar null si la sesión no existe', async () => {
      authRepo.getSessionInfo.mockResolvedValue(null);

      const result = await authService.validate(
        'noone@test.com',
        'password123',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('debería retornar access_token y data del usuario', async () => {
      const sessionInfo = { id: 1, typeId: 1, rolId: 1 };
      const fullSessionInfo = {
        id: 1n,
        email: 'john@test.com',
        user: {
          id: 1n,
          name: 'John',
          lastName: 'Doe',
          imgUrl: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        type: { id: 1, name: 'Web' },
        rol: { id: 1, name: 'Super Admin' },
      };
      authRepo.getSessionInfo.mockResolvedValue(fullSessionInfo);

      const result = await authService.login(sessionInfo);

      expect(jwtService.sign).toHaveBeenCalledWith(sessionInfo, {
        jwtid: 'mock-nanoid',
      });
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        ...fullSessionInfo.user,
        email: 'john@test.com',
        type: 'Web',
        rol: 'Super Admin',
      });
    });
  });

  describe('logout', () => {
    it('debería guardar jti en cache con TTL en milisegundos', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const req = {
        headers: { authorization: 'Bearer my-token' },
      } as any;
      jwtService.decode.mockReturnValue({
        payload: { jti: 'mock-jti', exp: futureExp },
      });

      await authService.logout(req);

      expect(jwtService.decode).toHaveBeenCalledWith('my-token', {
        complete: true,
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'mock-jti',
        'mock-jti',
        expect.any(Number),
      );
      // Verify TTL is positive (roughly 3600 seconds * 1000 ms)
      const ttl = cacheManager.set.mock.calls[0][2];
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600 * 1000 + 1000);
    });
  });

  describe('getMyInfo', () => {
    it('debería retornar información del usuario sin el token', async () => {
      const sessionInfo = { id: 1, typeId: 1, rolId: 1 };
      const fullSessionInfo = {
        id: 1n,
        email: 'john@test.com',
        user: {
          id: 1n,
          name: 'John',
          lastName: 'Doe',
          imgUrl: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        type: { id: 1, name: 'Web' },
        rol: { id: 1, name: 'Super Admin' },
      };
      authRepo.getSessionInfo.mockResolvedValue(fullSessionInfo);

      const result = await authService.getMyInfo(sessionInfo);

      expect(authRepo.getSessionInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: sessionInfo.id } },
        }),
      );
      expect(result).toEqual({
        ...fullSessionInfo.user,
        email: 'john@test.com',
        type: 'Web',
        rol: 'Super Admin',
      });
    });
  });

  describe('sendRecoveryMail', () => {
    it('debería lanzar NotFoundException si el email no existe', async () => {
      const error = new Error('Not found');
      error.name = 'NotFoundError';
      authRepo.sendRecoveryMail.mockRejectedValue(error);

      await expect(
        authService.sendRecoveryMail({ email: 'fake@test.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar InternalServerErrorException en error desconocido', async () => {
      const error = new Error('Unknown');
      error.name = 'SomethingElse';
      authRepo.sendRecoveryMail.mockRejectedValue(error);

      await expect(
        authService.sendRecoveryMail({ email: 'test@test.com' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('debería retornar éxito si el email existe', async () => {
      authRepo.sendRecoveryMail.mockResolvedValue({
        message: 'Recovery Mail Successfully Sent',
      });

      const result = await authService.sendRecoveryMail({
        email: 'john@test.com',
      });

      expect(result).toEqual({
        message: 'Recovery Mail Successfully Sent',
      });
    });
  });

  describe('resetPassword', () => {
    it('debería delegar al repositorio', async () => {
      const dto = { token: 'reset-token', newPassword: 'NewPassword123' };
      authRepo.resetPassword.mockResolvedValue({
        message: 'Password Changed',
      });

      const result = await authService.resetPassword(dto);

      expect(authRepo.resetPassword).toHaveBeenCalledWith(
        dto.token,
        dto.newPassword,
      );
      expect(result).toEqual({ message: 'Password Changed' });
    });
  });
});
