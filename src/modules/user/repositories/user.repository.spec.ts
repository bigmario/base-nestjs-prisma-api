import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { PrismaService } from '@core/prisma/services/prisma.service';
import { PaginationService } from '@core/pagination/services/pagination.service';
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
      }
    };

    const mockPaginationService = {
      buildUrl: jest.fn().mockReturnValue('http://localhost:3000/users/1'),
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
        }
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
          rolId: 1
        },
        newResourceUrl: true
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
  });

  describe('updateUser', () => {
    it('should update user in transaction', async () => {
      const updateOptions = {
        id: 1,
        body: { name: 'Updated' },
        resourceUrl: true
      };
      
      const mockTransactionClient = {
        user: { update: jest.fn().mockResolvedValue(mockUser) },
      };
      
      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransactionClient as any);
      });

      const result = await repository.updateUser(updateOptions as any);
      
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(mockTransactionClient.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty('url', 'http://localhost:3000/users/1');
    });
  });
});
