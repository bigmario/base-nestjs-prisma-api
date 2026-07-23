import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisCacheService } from './redis-cache.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockCache: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value on HIT', async () => {
      mockCache.get.mockResolvedValue({ id: 1, name: 'cached' });

      const result = await service.get('test-key');

      expect(mockCache.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual({ id: 1, name: 'cached' });
    });

    it('should return undefined on MISS', async () => {
      mockCache.get.mockResolvedValue(undefined);

      const result = await service.get('missing-key');

      expect(result).toBeUndefined();
    });

    it('should return undefined when Redis throws (graceful degradation)', async () => {
      mockCache.get.mockRejectedValue(new Error('Connection refused'));

      const result = await service.get('any-key');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should store a value with TTL', async () => {
      mockCache.set.mockResolvedValue(undefined);

      await service.set('my-key', { data: true }, 60000);

      expect(mockCache.set).toHaveBeenCalledWith(
        'my-key',
        { data: true },
        60000,
      );
    });

    it('should not throw when Redis fails (graceful degradation)', async () => {
      mockCache.set.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.set('my-key', { data: true }),
      ).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      mockCache.del.mockResolvedValue(undefined);

      await service.del('key-to-delete');

      expect(mockCache.del).toHaveBeenCalledWith('key-to-delete');
    });

    it('should not throw when Redis fails (graceful degradation)', async () => {
      mockCache.del.mockRejectedValue(new Error('Connection refused'));

      await expect(service.del('any-key')).resolves.toBeUndefined();
    });
  });

  describe('delByPrefix', () => {
    it('should delete all registered keys for the prefix', async () => {
      const registryKey = '__registry__:api:user:list';
      const registeredKeys = [
        'api:user:list:page=1&limit=10',
        'api:user:list:page=2&limit=10',
      ];

      mockCache.get.mockImplementation(async (key: string) => {
        if (key === registryKey) return registeredKeys;
        return undefined;
      });
      mockCache.del.mockResolvedValue(undefined);

      await service.delByPrefix('api:user:list');

      // Should delete each registered key + the registry itself
      expect(mockCache.del).toHaveBeenCalledTimes(3);
      expect(mockCache.del).toHaveBeenCalledWith(
        'api:user:list:page=1&limit=10',
      );
      expect(mockCache.del).toHaveBeenCalledWith(
        'api:user:list:page=2&limit=10',
      );
      expect(mockCache.del).toHaveBeenCalledWith(registryKey);
    });

    it('should do nothing when no keys are registered', async () => {
      mockCache.get.mockResolvedValue(undefined);

      await service.delByPrefix('api:empty');

      expect(mockCache.del).not.toHaveBeenCalled();
    });
  });

  describe('setWithPrefix', () => {
    it('should store value and register the key under its prefix', async () => {
      mockCache.set.mockResolvedValue(undefined);
      mockCache.get.mockResolvedValue(undefined);

      await service.setWithPrefix(
        'api:user:list',
        'api:user:list:page=1',
        { data: [] },
        120000,
      );

      // Should call set for the value
      expect(mockCache.set).toHaveBeenCalledWith(
        'api:user:list:page=1',
        { data: [] },
        120000,
      );

      // Should call set for the registry
      expect(mockCache.set).toHaveBeenCalledWith(
        '__registry__:api:user:list',
        ['api:user:list:page=1'],
        0,
      );
    });
  });

  describe('reset', () => {
    it('should execute without errors', async () => {
      await expect(service.reset()).resolves.toBeUndefined();
    });

    it('should handle missing cache manager gracefully', async () => {
      const serviceWithoutCache = new RedisCacheService(undefined);
      await expect(serviceWithoutCache.reset()).resolves.toBeUndefined();
    });
  });

  describe('graceful degradation without cache manager', () => {
    it('should handle undefined cache manager', async () => {
      const serviceWithoutCache = new RedisCacheService(undefined);

      expect(await serviceWithoutCache.get('key')).toBeUndefined();
      await expect(
        serviceWithoutCache.set('key', 'val'),
      ).resolves.toBeUndefined();
      await expect(serviceWithoutCache.del('key')).resolves.toBeUndefined();
      await expect(
        serviceWithoutCache.delByPrefix('prefix'),
      ).resolves.toBeUndefined();
      await expect(serviceWithoutCache.reset()).resolves.toBeUndefined();
    });
  });
});
