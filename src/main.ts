import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  const corsOrigin = configService.get<string>(
    'security.corsOrigin',
    'http://localhost:3000'
  );
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerEnabled = configService.get<boolean>('swagger.enabled', true);
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('swagger.title', 'HRM API'))
      .setDescription(
        configService.get<string>(
          'swagger.description',
          'Human Resource Management API'
        )
      )
      .setVersion(configService.get<string>('swagger.version', '1.0.0'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerPath = configService.get<string>('swagger.path', 'api/docs');
    SwaggerModule.setup(swaggerPath, app, document);
    logger.log(`Swagger docs available at /${swaggerPath}`);
  }

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(
    `Environment: ${configService.get<string>('app.nodeEnv', 'development')}`
  );
}

void bootstrap();
