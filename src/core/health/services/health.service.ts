import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@core/prisma/services/prisma.service';
import { RedisCacheService } from '@core/cache/redis-cache.service';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  info: {
    database: { status: 'up' | 'down'; latencyMs?: number };
    redis: { status: 'up' | 'degraded' | 'down'; latencyMs?: number };
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    const dbHealth = await this.checkDatabase();
    const redisHealth = await this.checkRedis();

    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';
    if (dbHealth.status === 'down') {
      overallStatus = 'down';
    } else if (redisHealth.status !== 'up') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      info: {
        database: dbHealth,
        redis: redisHealth,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<{
    status: 'up' | 'down';
    latencyMs?: number;
  }> {
    const start = performance.now();
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      const latencyMs = Math.round(performance.now() - start);
      return { status: 'up', latencyMs };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      return { status: 'down' };
    }
  }

  private async checkRedis(): Promise<{
    status: 'up' | 'degraded' | 'down';
    latencyMs?: number;
  }> {
    const start = performance.now();
    try {
      const pingKey = '__health_ping__';
      await this.cacheService.set(pingKey, 'pong', 5000);
      const res = await this.cacheService.get<string>(pingKey);
      const latencyMs = Math.round(performance.now() - start);

      if (res === 'pong') {
        return { status: 'up', latencyMs };
      }
      return { status: 'degraded' };
    } catch (error) {
      this.logger.warn(
        `Redis health check warning (graceful degradation active): ${error.message}`,
      );
      return { status: 'degraded' };
    }
  }
}
