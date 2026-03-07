import { Global, Module } from '@nestjs/common';

import { AuthModule } from '../modules/auth/index.js';

import { DatabaseModule } from './database/database.module.js';
import { LoggingModule } from './logging/logging.module.js';

@Global()
@Module({
  imports: [DatabaseModule, LoggingModule, AuthModule],
  exports: [DatabaseModule, LoggingModule, AuthModule],
})
export class SharedModule {}
