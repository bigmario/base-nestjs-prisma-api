import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    reflector = {
      get: jest.fn(),
      getAllAndOverride: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('debería permitir acceso si no se requieren roles', () => {
    (reflector.get as jest.Mock).mockReturnValue(undefined);
    const context = createMockContext({ rolId: 1 });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('debería permitir acceso si el usuario tiene el rol requerido', () => {
    (reflector.get as jest.Mock).mockReturnValue([1, 2]); // ROLES
    const context = createMockContext({ rolId: 1 });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('debería lanzar ForbiddenException si el usuario no tiene el rol requerido', () => {
    (reflector.get as jest.Mock).mockReturnValue([1, 2]); // ROLES
    const context = createMockContext({ rolId: 3 });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
