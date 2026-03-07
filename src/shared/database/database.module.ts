import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 5432),
        username: configService.get<string>('database.username', 'postgres'),
        password: configService.get<string>('database.password', ''),
        database: configService.get<string>('database.name', 'hrm_db'),
        ssl: configService.get<boolean>('database.ssl', false),
        logging: configService.get<boolean>('database.logging', false),
        autoLoadEntities: true,
        synchronize: configService.get<string>('app.nodeEnv') !== 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}
