import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    return {
      success: true,
      message: 'Service is healthy',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }

  getInfo() {
    return {
      success: true,
      message: 'Application info',
      data: {
        name: this.configService.get<string>('app.name', 'HRM API'),
        version: this.configService.get<string>('app.version', '1.0.0'),
        environment: this.configService.get<string>(
          'app.nodeEnv',
          'development'
        ),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
