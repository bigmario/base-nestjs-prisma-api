import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../services/auth.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: any;
  let authService: any;
  let cacheManager: any;

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    authService = {
      jwtService: {
        decode: jest.fn().mockReturnValue({ jti: 'mock-jti' }),
      },
    };

    cacheManager = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: Reflector, useValue: reflector },
        { provide: AuthService, useValue: authService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    // Mock the parent class canActivate
    jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // The guard uses context.getArgs()[0].headers.authorization
  const createMockContext = (
    headers: Record<string, string> = {},
    isPublic = false,
  ): ExecutionContext => {
    const request = { headers };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn().mockReturnValue([request]),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  };

  it('debería permitir acceso a rutas publicas', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('debería lanzar UnauthorizedException cuando no hay header de autorizacion', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debería lanzar UnauthorizedException cuando el token está revocado (en cache)', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({
      authorization: 'Bearer revoked-token',
    });
    cacheManager.get.mockResolvedValue('mock-jti'); // Token blacklisted

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debería llamar super.canActivate cuando el token es valido', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({
      authorization: 'Bearer valid-token',
    });
    cacheManager.get.mockResolvedValue(null); // Token NOT blacklisted

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(AuthGuard('jwt').prototype.canActivate).toHaveBeenCalledWith(
      context,
    );
  });
});
