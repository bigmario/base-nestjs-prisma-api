import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '@core/prisma/services/prisma.service';
import { EmailService } from '@core/email/services/email.service';

import { AuthRepository } from './auth.repository';

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn().mockReturnValue('hashed-password'),
}));

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prismaService: {
    session: {
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let mailService: { sendPassRecoveryMail: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      session: {
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };
    mailService = {
      sendPassRecoveryMail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: mailService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getSessionInfo', () => {
    it('should delegate to prisma findFirst', async () => {
      const session = { id: 1n, email: 'john@test.com' };
      prismaService.session.findFirst.mockResolvedValue(session);
      const findOptions = { where: { email: 'john@test.com' } };

      const result = await repository.getSessionInfo(findOptions);

      expect(prismaService.session.findFirst).toHaveBeenCalledWith(findOptions);
      expect(result).toBe(session);
    });
  });

  describe('updateMetadata', () => {
    it('should increment login count and update last access', async () => {
      prismaService.session.update.mockResolvedValue(undefined);

      await repository.updateMetadata(1n);

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: {
          timesLoggedIn: { increment: 1 },
          lastAccess: expect.any(Date),
        },
      });
    });
  });

  describe('sendRecoveryMail', () => {
    const session = {
      id: 1n,
      email: 'john@test.com',
      user: { id: 10n },
    };

    it('should sign a token, persist it and send the recovery mail', async () => {
      prismaService.session.findFirstOrThrow.mockResolvedValue(session);
      prismaService.session.update.mockResolvedValue(undefined);
      mailService.sendPassRecoveryMail.mockResolvedValue({
        accepted: ['john@test.com'],
      });

      const result = await repository.sendRecoveryMail({});

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 10n },
        { expiresIn: '15min' },
      );
      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { recoveryToken: 'signed-token' },
      });
      expect(mailService.sendPassRecoveryMail).toHaveBeenCalledWith(
        'john@test.com',
        'http://myfrontend.com/recovery?token=signed-token',
      );
      expect(result).toEqual({ message: 'Recovery Mail Successfully Sent' });
    });

    it('should throw when the mail is not accepted', async () => {
      prismaService.session.findFirstOrThrow.mockResolvedValue(session);
      prismaService.session.update.mockResolvedValue(undefined);
      mailService.sendPassRecoveryMail.mockResolvedValue({ accepted: [] });

      await expect(repository.sendRecoveryMail({} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('resetPassword', () => {
    it('should hash the new password and clear the recovery token', async () => {
      jwtService.verify.mockReturnValue({ sub: 10n });
      prismaService.session.findFirstOrThrow.mockResolvedValue({
        id: 1n,
        recoveryToken: 'valid-token',
        user: { id: 10n },
      });
      prismaService.session.update.mockResolvedValue(undefined);

      const result = await repository.resetPassword(
        'valid-token',
        'newPass123',
      );

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { recoveryToken: null, password: 'hashed-password' },
      });
      expect(result).toEqual({ message: 'Password Changed' });
    });

    it('should wrap a mismatched recovery token error', async () => {
      jwtService.verify.mockReturnValue({ sub: 10n });
      prismaService.session.findFirstOrThrow.mockResolvedValue({
        id: 1n,
        recoveryToken: 'other-token',
        user: { id: 10n },
      });

      await expect(
        repository.resetPassword('valid-token', 'newPass123'),
      ).rejects.toThrow(InternalServerErrorException);
      expect(prismaService.session.update).not.toHaveBeenCalled();
    });

    it('should wrap verification failures as internal server errors', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new BadRequestException('invalid');
      });

      await expect(
        repository.resetPassword('bad-token', 'newPass123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
