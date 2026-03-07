import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('app.nodeEnv') === 'production';
        const logLevel = configService.get<string>('logging.level', 'info');

        const transports: winston.transport[] = [
          new winston.transports.Console({
            format: isProduction
              ? winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.json()
                )
              : winston.format.combine(
                  winston.format.timestamp(),
                  nestWinstonModuleUtilities.format.nestLike(
                    configService.get<string>('app.name', 'HRM API'),
                    { prettyPrint: true, colors: true }
                  )
                ),
          }),
        ];

        if (isProduction) {
          transports.push(
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
              maxsize: 10 * 1024 * 1024,
              maxFiles: 5,
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
              maxsize: 10 * 1024 * 1024,
              maxFiles: 5,
            })
          );
        }

        return {
          level: logLevel,
          transports,
        };
      },
    }),
  ],
})
export class LoggingModule {}
