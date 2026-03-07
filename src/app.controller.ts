import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service.js';

@ApiTags('health')
@Controller('api/v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return this.appService.getHealth();
  }

  @Get('info')
  @ApiOperation({ summary: 'Application info' })
  @ApiResponse({ status: 200, description: 'Application metadata' })
  getInfo() {
    return this.appService.getInfo();
  }
}
