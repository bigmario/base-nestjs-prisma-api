import { Test, TestingModule } from '@nestjs/testing';

import { PaginationService } from '@core/pagination/services/pagination.service';
import { RedisCacheService } from '@core/cache/redis-cache.service';

import { BaseRepository, CacheOptions } from './base.repository';

describe('BaseRepository', () => {
  let repository: BaseRepository;
  let paginationService: { createPaginator: jest.Mock };
  let cacheService: {
    get: jest.Mock;
    setWithPrefix: jest.Mock;
    del: jest.Mock;
    delByPrefix: jest.Mock;
  };

  const buildModule = async (withCache = true) => {
    paginationService = {
      createPaginator: jest.fn(),
    };
    cacheService = {
      get: jest.fn(),
      setWithPrefix: jest.fn(),
      del: jest.fn(),
      delByPrefix: jest.fn(),
    };

    const providers: any[] = [
      BaseRepository,
      { provide: PaginationService, useValue: paginationService },
    ];

    if (withCache) {
      providers.push({ provide: RedisCacheService, useValue: cacheService });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers,
    }).compile();

    repository = module.get<BaseRepository>(BaseRepository);
  };

  beforeEach(async () => {
    await buildModule(true);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findOne', () => {
    it('should call findFirstOrThrow with select and where', async () => {
      const model = {
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: 1 }),
      };
      const args = { select: { id: true }, where: { id: 1 } };

      const result = await repository.findOne(model, args);

      expect(model.findFirstOrThrow).toHaveBeenCalledWith({
        select: { id: true },
        where: { id: 1 },
      });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findAll', () => {
    it('should call findMany when pagination is disabled', async () => {
      const model = {
        findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      };

      const result = await repository.findAll(model, {
        paginate: false,
        resourceBaseUrl: '/users',
        findManyArgs: { select: { id: true }, where: { deletedAt: null } },
      } as any);

      expect(model.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { deletedAt: null },
      });
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should delegate to paginateQuery when pagination is enabled', async () => {
      const model = { findMany: jest.fn() };
      const paginated = { data: [], meta: {} };
      const paginateFn = jest.fn().mockResolvedValue(paginated);
      paginationService.createPaginator.mockReturnValue(paginateFn);

      const result = await repository.findAll(model, {
        paginate: true,
        resourceBaseUrl: '/users',
        findManyArgs: {
          select: { id: true },
          where: {},
          page: 2,
          limit: 5,
        },
      } as any);

      expect(paginationService.createPaginator).toHaveBeenCalledWith({
        limit: 5,
        page: 2,
        resourceBaseUrl: '/users',
      });
      expect(paginateFn).toHaveBeenCalledWith(model, {
        select: { id: true },
        where: {},
      });
      expect(result).toBe(paginated);
    });
  });

  describe('findOneCached', () => {
    const cacheOpts: CacheOptions = {
      keyPrefix: 'api:user:item',
      keySuffix: '1',
      ttl: 1000,
    };

    it('should return cached value on hit without querying db', async () => {
      cacheService.get.mockResolvedValue({ id: 1, cached: true });
      const model = { findFirstOrThrow: jest.fn() };

      const result = await repository.findOneCached(model, {}, cacheOpts);

      expect(cacheService.get).toHaveBeenCalledWith('api:user:item:1');
      expect(model.findFirstOrThrow).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 1, cached: true });
    });

    it('should query db and store in cache on miss', async () => {
      cacheService.get.mockResolvedValue(null);
      const model = {
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: 1 }),
      };

      const result = await repository.findOneCached(model, {}, cacheOpts);

      expect(model.findFirstOrThrow).toHaveBeenCalled();
      expect(cacheService.setWithPrefix).toHaveBeenCalledWith(
        'api:user:item',
        'api:user:item:1',
        { id: 1 },
        1000,
      );
      expect(result).toEqual({ id: 1 });
    });

    it('should not cache a falsy db result', async () => {
      cacheService.get.mockResolvedValue(null);
      const model = {
        findFirstOrThrow: jest.fn().mockResolvedValue(null),
      };

      await repository.findOneCached(model, {}, cacheOpts);

      expect(cacheService.setWithPrefix).not.toHaveBeenCalled();
    });

    it('should fall through to db when cache service is absent', async () => {
      await buildModule(false);
      const model = {
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: 1 }),
      };

      const result = await repository.findOneCached(model, {}, cacheOpts);

      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findAllCached', () => {
    const cacheOpts: CacheOptions = { keyPrefix: 'api:user:list' };
    const options = {
      paginate: false,
      resourceBaseUrl: '/users',
      findManyArgs: { select: { id: true }, where: {} },
    } as any;

    it('should return cached value on hit', async () => {
      cacheService.get.mockResolvedValue([{ id: 1 }]);
      const model = { findMany: jest.fn() };

      const result = await repository.findAllCached(model, options, cacheOpts);

      expect(cacheService.get).toHaveBeenCalledWith('api:user:list');
      expect(model.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should query db and cache result on miss', async () => {
      cacheService.get.mockResolvedValue(undefined);
      const model = { findMany: jest.fn().mockResolvedValue([{ id: 2 }]) };

      const result = await repository.findAllCached(model, options, cacheOpts);

      expect(model.findMany).toHaveBeenCalled();
      expect(cacheService.setWithPrefix).toHaveBeenCalledWith(
        'api:user:list',
        'api:user:list',
        [{ id: 2 }],
        undefined,
      );
      expect(result).toEqual([{ id: 2 }]);
    });
  });

  describe('invalidateModelCache', () => {
    it('should invalidate list cache and item cache when id is provided', async () => {
      await repository.invalidateModelCache('api:user', 5);

      expect(cacheService.delByPrefix).toHaveBeenCalledWith('api:user:list');
      expect(cacheService.del).toHaveBeenCalledWith('api:user:item:5');
    });

    it('should only invalidate list cache when no id is provided', async () => {
      await repository.invalidateModelCache('api:user');

      expect(cacheService.delByPrefix).toHaveBeenCalledWith('api:user:list');
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('should do nothing when cache service is absent', async () => {
      await buildModule(false);

      await expect(
        repository.invalidateModelCache('api:user', 5),
      ).resolves.toBeUndefined();
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and invalidate cache when prefix is given', async () => {
      const model = {
        update: jest.fn().mockResolvedValue({ id: 3 }),
      };
      const invalidateSpy = jest.spyOn(repository, 'invalidateModelCache');

      const result = await repository.softDelete(model, 3, 'api:user');

      expect(model.update).toHaveBeenCalledWith({
        where: { id: 3 },
        select: { id: true },
        data: { deletedAt: expect.any(Date) },
      });
      expect(invalidateSpy).toHaveBeenCalledWith('api:user', 3);
      expect(result).toEqual({ id: 3 });
    });

    it('should not invalidate cache when prefix is omitted', async () => {
      const model = { update: jest.fn().mockResolvedValue({ id: 3 }) };
      const invalidateSpy = jest.spyOn(repository, 'invalidateModelCache');

      await repository.softDelete(model, 3);

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('buildFilters', () => {
    it('should build a contains filter for each column/term combination', () => {
      const result = repository.buildFilters('john doe', ['name', 'lastName']);

      expect(result).toEqual([
        { name: { contains: 'john', mode: 'insensitive' } },
        { name: { contains: 'doe', mode: 'insensitive' } },
        { lastName: { contains: 'john', mode: 'insensitive' } },
        { lastName: { contains: 'doe', mode: 'insensitive' } },
      ]);
    });

    it('should handle a single search term', () => {
      const result = repository.buildFilters('john', ['name']);

      expect(result).toEqual([
        { name: { contains: 'john', mode: 'insensitive' } },
      ]);
    });
  });
});
