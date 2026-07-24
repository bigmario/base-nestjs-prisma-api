import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRepository } from './user.repository';
import { PrismaService } from '@core/prisma/services/prisma.service';
import { PaginationService } from '@core/pagination/services/pagination.service';
import { RedisCacheService } from '@core/cache/redis-cache.service';
import { mockUser } from '../../../test-utils/fixtures/user.fixture';

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn().mockReturnValue('hashed-password'),
  compareSync: jest.fn(),
}));

describe('UserRepository', () => {
  let repository: UserRepository;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
      user: {
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
      },
    };

    const mockPaginationService = {
      buildUrl: jest.fn().mockReturnValue('http://localhost:3000/users/1'),
    };

    const mockRedisCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPrefix: jest.fn(),
      setWithPrefix: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
        {
          provide: RedisCacheService,
          useValue: mockRedisCacheService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createUser', () => {
    it('should create session and user in transaction', async () => {
      const createOptions = {
        body: {
          email: 'test@test.com',
          password: 'pass',
          name: 'Test',
          lastName: 'User',
          rolId: 1,
        },
        newResourceUrl: true,
      };

      const mockSession = { id: 1n };
      const mockTransactionClient = {
        session: { create: jest.fn().mockResolvedValue(mockSession) },
        user: { create: jest.fn().mockResolvedValue(mockUser) },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransactionClient as any);
      });

      const result = await repository.createUser(createOptions as any);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(mockTransactionClient.session.create).toHaveBeenCalled();
      expect(mockTransactionClient.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('url', 'http://localhost:3000/users/1');
    });

    it('should map a unique-constraint violation (P2002) to ConflictException', async () => {
      const createOptions = {
        body: {
          email: 'dupe@test.com',
          password: 'pass',
          name: 'Test',
          lastName: 'User',
          rolId: 1,
        },
        newResourceUrl: true,
      };

      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.0.0', meta: { target: ['email'] } },
      );

      const mockTransactionClient = {
        session: { create: jest.fn().mockRejectedValue(p2002) },
        user: { create: jest.fn() },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransactionClient as any);
      });

      await expect(repository.createUser(createOptions as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateUser', () => {
    it('should update user in transaction', async () => {
      const updateOptions = {
        id: 1,
        body: { name: 'Updated' },
        resourceUrl: true,
      };

      const mockTransactionClient = {
        user: { update: jest.fn().mockResolvedValue(mockUser) },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransactionClient as any);
      });

      const result = await repository.updateUser(updateOptions);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(mockTransactionClient.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty('url', 'http://localhost:3000/users/1');
    });

    it('should map a missing-record error (P2025) to NotFoundException', async () => {
      const updateOptions = {
        id: 999,
        body: { name: 'Updated' },
        resourceUrl: true,
      };

      const p2025 = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        { code: 'P2025', clientVersion: '6.0.0' },
      );

      const mockTransactionClient = {
        user: { update: jest.fn().mockRejectedValue(p2025) },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransactionClient as any);
      });

      await expect(repository.updateUser(updateOptions)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
