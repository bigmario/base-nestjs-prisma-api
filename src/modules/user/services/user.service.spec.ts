import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { BadRequestException } from '@nestjs/common';
import {
  mockUser,
  mockUserRoles,
  mockUserStatuses,
  mockPaginatedResult,
  mockCreateUserDto,
  mockUpdateUserDto,
} from '../../../test-utils/fixtures/user.fixture';

describe('UserService', () => {
  let service: UserService;
  let repository: Record<string, any>;

  beforeEach(async () => {
    const mockUserRepository = {
      findAll: jest.fn(),
      findAllCached: jest.fn(),
      findOne: jest.fn(),
      findOneCached: jest.fn(),
      softDelete: jest.fn(),
      buildFilters: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      invalidateModelCache: jest.fn(),
      prismaService: {
        user: 'user_model',
        session_rol: 'session_rol_model',
        session_status: 'session_status_model',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUserRoles', () => {
    it('debería llamar findAllCached con los args correctos y retornar resultado', async () => {
      const queryParams = { page: 1, limit: 10 };
      const expectedResult = {
        data: mockUserRoles,
        meta: { totalItems: 2 },
      };
      repository.findAllCached.mockResolvedValue(expectedResult);

      const result = await service.getAllUserRoles(queryParams);

      expect(repository.findAllCached).toHaveBeenCalledWith(
        repository.prismaService.session_rol,
        expect.objectContaining({
          paginate: true,
          resourceBaseUrl: expect.any(String),
          findManyArgs: expect.objectContaining({
            limit: 10,
            page: 1,
          }),
        }),
        expect.objectContaining({
          keyPrefix: 'api:user:roles',
          ttl: 3_600_000,
        }),
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAllUserStatuses', () => {
    it('debería llamar findAllCached con los args correctos y retornar resultado', async () => {
      const queryParams = { page: 1, limit: 10 };
      const expectedResult = {
        data: mockUserStatuses,
        meta: { totalItems: 2 },
      };
      repository.findAllCached.mockResolvedValue(expectedResult);

      const result = await service.getAllUserStatuses(queryParams);

      expect(repository.findAllCached).toHaveBeenCalledWith(
        repository.prismaService.session_status,
        expect.objectContaining({
          paginate: true,
        }),
        expect.objectContaining({
          keyPrefix: 'api:user:statuses',
          ttl: 3_600_000,
        }),
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAllUsers', () => {
    it('debería retornar data formateada con meta', async () => {
      const queryParams = { page: 1, limit: 10 };
      repository.findAllCached.mockResolvedValue(mockPaginatedResult);

      const result = await service.getAllUsers(queryParams);

      expect(repository.findAllCached).toHaveBeenCalledWith(
        repository.prismaService.user,
        expect.objectContaining({
          paginate: true,
        }),
        expect.objectContaining({
          keyPrefix: 'api:user:list',
          ttl: 120_000,
        }),
      );
      // The service transforms data
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('email', 'john@test.com');
      expect(result.meta).toEqual(mockPaginatedResult.meta);
    });

    it('debería aplicar filtro de búsqueda cuando se provee search', async () => {
      const queryParams = { page: 1, limit: 10, search: 'John' };
      const filterResult = [
        { name: { contains: 'John', mode: 'insensitive' } },
      ];
      repository.buildFilters.mockReturnValue(filterResult);
      repository.findAllCached.mockResolvedValue(mockPaginatedResult);

      await service.getAllUsers(queryParams);

      expect(repository.buildFilters).toHaveBeenCalledWith('John', [
        'name',
        'lastName',
        'identityCard',
      ]);
    });
  });

  describe('getUserById', () => {
    it('debería retornar datos del usuario formateados', async () => {
      repository.findOneCached.mockResolvedValue(mockUser);

      const result = await service.getUserById(1);

      expect(repository.findOneCached).toHaveBeenCalledWith(
        repository.prismaService.user,
        expect.objectContaining({
          where: { id: 1, deletedAt: null },
        }),
        expect.objectContaining({
          keyPrefix: 'api:user:item',
          keySuffix: '1',
          ttl: 600_000,
        }),
      );
      expect(result).toHaveProperty('email', 'john@test.com');
      expect(result).toHaveProperty('name', 'John');
    });

    it('debería lanzar BadRequestException si el usuario no existe (P2025)', async () => {
      const error = new Error('Not found') as any;
      error.code = 'P2025';
      repository.findOneCached.mockRejectedValue(error);

      await expect(service.getUserById(999)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createUser', () => {
    it('debería retornar mensaje de éxito con url e invalidar cache', async () => {
      repository.createUser.mockResolvedValue({ id: 1n, url: '/users/1' });
      repository.invalidateModelCache.mockResolvedValue(undefined);

      const result = await service.createUser(mockCreateUserDto as any);

      expect(repository.createUser).toHaveBeenCalledWith({
        body: mockCreateUserDto,
        newResourceUrl: true,
      });
      expect(repository.invalidateModelCache).toHaveBeenCalledWith(
        'api:user:list',
      );
      expect(result).toEqual({
        message: 'Usuario creado con éxito',
        url: '/users/1',
      });
    });
  });

  describe('updateUser', () => {
    it('debería retornar mensaje de éxito con url e invalidar cache', async () => {
      repository.updateUser.mockResolvedValue({ id: 1n, url: '/users/1' });
      repository.invalidateModelCache.mockResolvedValue(undefined);

      const result = await service.updateUser(1, mockUpdateUserDto);

      expect(repository.updateUser).toHaveBeenCalledWith({
        id: 1,
        body: mockUpdateUserDto,
        resourceUrl: true,
      });
      expect(repository.invalidateModelCache).toHaveBeenCalledWith(
        'api:user:item',
        1,
      );
      expect(repository.invalidateModelCache).toHaveBeenCalledWith(
        'api:user:list',
      );
      expect(result).toEqual({
        message: 'Usuario creado con éxito',
        url: '/users/1',
      });
    });
  });

  describe('deleteUser', () => {
    it('debería retornar mensaje de éxito e invalidar cache', async () => {
      repository.softDelete.mockResolvedValue({ id: 1 });
      repository.invalidateModelCache.mockResolvedValue(undefined);

      const result = await service.deleteUser(1);

      expect(repository.softDelete).toHaveBeenCalledWith(
        repository.prismaService.user,
        1,
        'api:user:item',
      );
      expect(repository.invalidateModelCache).toHaveBeenCalledWith(
        'api:user:list',
      );
      expect(result).toEqual({ message: 'Usuario eliminado con éxito' });
    });

    it('debería lanzar BadRequestException si el usuario no existe (P2025)', async () => {
      const error = new Error('Not found') as any;
      error.code = 'P2025';
      repository.softDelete.mockRejectedValue(error);

      await expect(service.deleteUser(999)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
