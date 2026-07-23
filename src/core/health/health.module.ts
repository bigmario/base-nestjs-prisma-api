import { Module } from '@nestjs/common';

import { PrismaModule } from '@core/prisma/prisma.module';
import { RedisCacheModule } from '@core/cache/redis-cache.module';
import { HealthService } from '@core/health/services/health.service';
import { HealthController } from '@core/health/controllers/health.controller';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
