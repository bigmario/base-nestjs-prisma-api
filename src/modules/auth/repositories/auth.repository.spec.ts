import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthRepository } from './auth.repository';
import { PrismaService } from '@core/prisma/services/prisma.service';
import { EmailService } from '@core/email/services/email.service';
import { createMockPrismaService } from '../../../test-utils/mocks/prisma.mock';

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn().mockReturnValue('hashed-password'),
  compareSync: jest.fn(),
}));

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prismaService: ReturnType<typeof createMockPrismaService>;
  let jwtService: Record<string, jest.Mock>;

  beforeEach(async () => {
    prismaService = createMockPrismaService();

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: EmailService,
          useValue: { sendPassRecoveryMail: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('resetPassword', () => {
    it('debería propagar el BadRequestException cuando el token no coincide', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      prismaService.session.findFirstOrThrow.mockResolvedValue({
        id: 1n,
        recoveryToken: 'a-different-token',
        user: { id: 1n },
      });

      await expect(
        repository.resetPassword('incoming-token', 'NewPass123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería mapear errores de JWT a UnauthorizedException', async () => {
      const jwtError = new Error('jwt expired');
      jwtError.name = 'TokenExpiredError';
      jwtService.verify.mockImplementation(() => {
        throw jwtError;
      });

      await expect(
        repository.resetPassword('expired-token', 'NewPass123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería mapear P2025 a BadRequestException', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      const notFound: any = new Error('Not found');
      notFound.code = 'P2025';
      prismaService.session.findFirstOrThrow.mockRejectedValue(notFound);

      await expect(
        repository.resetPassword('token', 'NewPass123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar InternalServerErrorException sin filtrar el error crudo', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      prismaService.session.findFirstOrThrow.mockRejectedValue(
        new Error('secret db connection string leaked'),
      );

      const thrown = await repository
        .resetPassword('token', 'NewPass123')
        .catch((err) => err);

      expect(thrown).toBeInstanceOf(InternalServerErrorException);
      expect(JSON.stringify(thrown.getResponse())).not.toContain(
        'secret db connection string',
      );
    });

    it('debería cambiar la contraseña con un token válido', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      prismaService.session.findFirstOrThrow.mockResolvedValue({
        id: 1n,
        recoveryToken: 'token',
        user: { id: 1n },
      });
      prismaService.session.update.mockResolvedValue({ id: 1n });

      const result = await repository.resetPassword('token', 'NewPass123');

      expect(result).toEqual({ message: 'Password Changed' });
      expect(prismaService.session.update).toHaveBeenCalled();
    });
  });
});
