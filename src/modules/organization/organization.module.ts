import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessUnit } from './entities/business-unit.entity.js';
import { LegalEntity } from './entities/legal-entity.entity.js';
import { Location } from './entities/location.entity.js';

import { BusinessUnitsController } from './business-units.controller.js';
import { BusinessUnitsService } from './business-units.service.js';
import { LegalEntitiesController } from './legal-entities.controller.js';
import { LegalEntitiesService } from './legal-entities.service.js';
import { LocationsController } from './locations.controller.js';
import { LocationsService } from './locations.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([LegalEntity, BusinessUnit, Location])],
  controllers: [
    LegalEntitiesController,
    BusinessUnitsController,
    LocationsController,
  ],
  providers: [LegalEntitiesService, BusinessUnitsService, LocationsService],
  exports: [LegalEntitiesService, BusinessUnitsService, LocationsService],
})
export class OrganizationModule {}
