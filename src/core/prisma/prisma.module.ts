import { Module } from '@nestjs/common';

import { PrismaService } from '@core/prisma/services/prisma.service';
import { PaginationModule } from '@core/pagination/pagination.module';
import { BaseRepository } from '@core/prisma/repositories/base.repository';
import { RedisCacheModule } from '@core/cache/redis-cache.module';

@Module({
  imports: [PaginationModule, RedisCacheModule],
  providers: [PrismaService, BaseRepository],
  exports: [PrismaService, BaseRepository, PaginationModule],
})
export class PrismaModule {}
