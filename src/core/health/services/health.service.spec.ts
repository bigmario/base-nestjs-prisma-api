import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '@core/prisma/services/prisma.service';
import { RedisCacheService } from '@core/cache/redis-cache.service';

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: Record<string, jest.Mock>;
  let cacheService: Record<string, jest.Mock>;

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn(),
    };
    cacheService = {
      set: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return status ok when both DB and Redis are up', async () => {
    prismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    cacheService.set.mockResolvedValue(undefined);
    cacheService.get.mockResolvedValue('pong');

    const result = await service.checkHealth();

    expect(result.status).toBe('ok');
    expect(result.info.database.status).toBe('up');
    expect(result.info.redis.status).toBe('up');
  });

  it('should return status degraded when Redis fails', async () => {
    prismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    cacheService.get.mockRejectedValue(new Error('Connection error'));

    const result = await service.checkHealth();

    expect(result.status).toBe('degraded');
    expect(result.info.database.status).toBe('up');
    expect(result.info.redis.status).toBe('degraded');
  });

  it('should return status down when DB fails', async () => {
    prismaService.$queryRaw.mockRejectedValue(new Error('DB unreachable'));
    cacheService.set.mockResolvedValue(undefined);
    cacheService.get.mockResolvedValue('pong');

    const result = await service.checkHealth();

    expect(result.status).toBe('down');
    expect(result.info.database.status).toBe('down');
  });
});
