import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@narad/contracts';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'narad-api',
      time: new Date().toISOString(),
    };
  }
}
