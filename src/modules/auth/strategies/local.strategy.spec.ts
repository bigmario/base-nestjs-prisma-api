import { Test, TestingModule } from '@nestjs/testing';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../services/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { mockUser } from '../../../test-utils/fixtures/user.fixture';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<Partial<AuthService>>;

  beforeEach(async () => {
    authService = {
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('debería retornar el usuario cuando las credenciales son válidas', async () => {
      (authService.validate as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(authService.validate).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('debería lanzar UnauthorizedException cuando las credenciales son inválidas', async () => {
      (authService.validate as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate('test@example.com', 'wrong'))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });
});
