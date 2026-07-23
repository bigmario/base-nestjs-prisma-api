import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@auth/decorators/public.decorator';
import { HealthService } from '@core/health/services/health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API and infrastructure health check status' })
  public async getHealth() {
    return this.healthService.checkHealth();
  }
}
