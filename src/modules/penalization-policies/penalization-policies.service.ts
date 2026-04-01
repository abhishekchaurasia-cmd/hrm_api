import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';

import type { CreatePenalizationPolicyDto } from './dto/create-penalization-policy.dto.js';
import type { UpdatePenalizationPolicyDto } from './dto/update-penalization-policy.dto.js';
import { PenalizationPolicyVersion } from './entities/penalization-policy-version.entity.js';
import { PenalizationPolicy } from './entities/penalization-policy.entity.js';
import { PenalizationRule } from './entities/penalization-rule.entity.js';

export interface PenalizationPolicyWithVersion extends PenalizationPolicy {
  currentVersion?: PenalizationPolicyVersion;
}

@Injectable()
export class PenalizationPoliciesService {
  constructor(
    @InjectRepository(PenalizationPolicy)
    private readonly policyRepository: Repository<PenalizationPolicy>,
    @InjectRepository(PenalizationPolicyVersion)
    private readonly versionRepository: Repository<PenalizationPolicyVersion>,
    @InjectRepository(PenalizationRule)
    private readonly ruleRepository: Repository<PenalizationRule>,
    private readonly dataSource: DataSource
  ) {}

  async create(
    dto: CreatePenalizationPolicyDto
  ): Promise<ApiResponse<PenalizationPolicy>> {
    const result = await this.dataSource.transaction(async manager => {
      const policy = manager.create(PenalizationPolicy, {
        name: dto.name,
        description: dto.description ?? null,
      });
      const savedPolicy = await manager.save(PenalizationPolicy, policy);

      const version = manager.create(PenalizationPolicyVersion, {
        policyId: savedPolicy.id,
        versionNumber: 1,
        effectiveFrom: dto.effectiveFrom,
        deductionMethod: dto.deductionMethod,
        bufferPeriodDays: dto.bufferPeriodDays ?? 0,
      });
      const savedVersion = await manager.save(
        PenalizationPolicyVersion,
        version
      );

      const rules = dto.rules.map(ruleDto =>
        manager.create(PenalizationRule, {
          versionId: savedVersion.id,
          penaltyType: ruleDto.penaltyType,
          isEnabled: ruleDto.isEnabled,
          deductionPerIncident: ruleDto.deductionPerIncident,
          thresholdType: ruleDto.thresholdType ?? null,
          thresholdValue: ruleDto.thresholdValue ?? null,
          thresholdUnit: ruleDto.thresholdUnit ?? null,
          minInstancesBeforePenalty: ruleDto.minInstancesBeforePenalty ?? null,
          effectiveHoursPercentage: ruleDto.effectiveHoursPercentage ?? null,
        })
      );
      await manager.save(PenalizationRule, rules);

      savedVersion.rules = rules;
      savedPolicy.versions = [savedVersion];

      return savedPolicy;
    });

    return {
      success: true,
      message: 'Penalization policy created',
      data: result,
    };
  }

  async findAll(): Promise<ApiResponse<PenalizationPolicyWithVersion[]>> {
    const policies = await this.policyRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    const enriched: PenalizationPolicyWithVersion[] = [];
    for (const policy of policies) {
      const currentVersion = await this.getActiveVersion(policy.id);
      const enrichedPolicy: PenalizationPolicyWithVersion = {
        ...policy,
        currentVersion: currentVersion ?? undefined,
      };
      enriched.push(enrichedPolicy);
    }

    return {
      success: true,
      message: 'Penalization policies retrieved',
      data: enriched,
    };
  }

  async findOne(
    id: string
  ): Promise<ApiResponse<PenalizationPolicyWithVersion>> {
    const policy = await this.policyRepository.findOne({
      where: { id },
    });
    if (!policy) {
      throw new NotFoundException(
        `Penalization policy with ID "${id}" not found`
      );
    }

    const currentVersion = await this.getActiveVersion(id);
    const result: PenalizationPolicyWithVersion = {
      ...policy,
      currentVersion: currentVersion ?? undefined,
    };

    return {
      success: true,
      message: 'Penalization policy retrieved',
      data: result,
    };
  }

  async findVersions(
    policyId: string
  ): Promise<ApiResponse<PenalizationPolicyVersion[]>> {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId },
    });
    if (!policy) {
      throw new NotFoundException(
        `Penalization policy with ID "${policyId}" not found`
      );
    }

    const versions = await this.versionRepository.find({
      where: { policyId },
      relations: ['rules'],
      order: { versionNumber: 'DESC' },
    });

    return {
      success: true,
      message: 'Policy versions retrieved',
      data: versions,
    };
  }

  async findVersion(
    policyId: string,
    versionId: string
  ): Promise<ApiResponse<PenalizationPolicyVersion>> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId, policyId },
      relations: ['rules'],
    });
    if (!version) {
      throw new NotFoundException(
        `Version "${versionId}" not found for policy "${policyId}"`
      );
    }

    return {
      success: true,
      message: 'Policy version retrieved',
      data: version,
    };
  }

  async update(
    id: string,
    dto: UpdatePenalizationPolicyDto
  ): Promise<ApiResponse<PenalizationPolicy>> {
    const result = await this.dataSource.transaction(async manager => {
      const policy = await manager.findOne(PenalizationPolicy, {
        where: { id },
      });
      if (!policy) {
        throw new NotFoundException(
          `Penalization policy with ID "${id}" not found`
        );
      }

      if (dto.name !== undefined) {
        policy.name = dto.name;
      }
      if (dto.description !== undefined) {
        policy.description = dto.description ?? null;
      }
      await manager.save(PenalizationPolicy, policy);

      if (
        dto.rules ||
        dto.deductionMethod ||
        dto.bufferPeriodDays !== undefined ||
        dto.effectiveFrom
      ) {
        await manager.update(
          PenalizationPolicyVersion,
          { policyId: id, isActive: true },
          { isActive: false }
        );

        const latestVersion = await manager.findOne(PenalizationPolicyVersion, {
          where: { policyId: id },
          order: { versionNumber: 'DESC' },
        });

        const prevVersion = latestVersion;
        const newVersionNumber = (prevVersion?.versionNumber ?? 0) + 1;

        const newVersion = manager.create(PenalizationPolicyVersion, {
          policyId: id,
          versionNumber: newVersionNumber,
          effectiveFrom:
            dto.effectiveFrom ??
            prevVersion?.effectiveFrom ??
            new Date().toISOString().split('T')[0],
          deductionMethod: dto.deductionMethod ?? prevVersion?.deductionMethod,
          bufferPeriodDays:
            dto.bufferPeriodDays ?? prevVersion?.bufferPeriodDays ?? 0,
          isActive: true,
        });
        const savedVersion = await manager.save(
          PenalizationPolicyVersion,
          newVersion
        );

        if (dto.rules) {
          const rules = dto.rules.map(ruleDto =>
            manager.create(PenalizationRule, {
              versionId: savedVersion.id,
              penaltyType: ruleDto.penaltyType,
              isEnabled: ruleDto.isEnabled,
              deductionPerIncident: ruleDto.deductionPerIncident,
              thresholdType: ruleDto.thresholdType ?? null,
              thresholdValue: ruleDto.thresholdValue ?? null,
              thresholdUnit: ruleDto.thresholdUnit ?? null,
              minInstancesBeforePenalty:
                ruleDto.minInstancesBeforePenalty ?? null,
              effectiveHoursPercentage:
                ruleDto.effectiveHoursPercentage ?? null,
            })
          );
          await manager.save(PenalizationRule, rules);
        } else if (prevVersion) {
          const prevRules = await manager.find(PenalizationRule, {
            where: { versionId: prevVersion.id },
          });
          const clonedRules = prevRules.map(r =>
            manager.create(PenalizationRule, {
              versionId: savedVersion.id,
              penaltyType: r.penaltyType,
              isEnabled: r.isEnabled,
              deductionPerIncident: r.deductionPerIncident,
              thresholdType: r.thresholdType,
              thresholdValue: r.thresholdValue,
              thresholdUnit: r.thresholdUnit,
              minInstancesBeforePenalty: r.minInstancesBeforePenalty,
              effectiveHoursPercentage: r.effectiveHoursPercentage,
            })
          );
          await manager.save(PenalizationRule, clonedRules);
        }
      }

      return policy;
    });

    return {
      success: true,
      message: 'Penalization policy updated',
      data: result,
    };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const policy = await this.policyRepository.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException(
        `Penalization policy with ID "${id}" not found`
      );
    }

    policy.isActive = false;
    await this.policyRepository.save(policy);

    return {
      success: true,
      message: 'Penalization policy deactivated',
      data: null,
    };
  }

  async getActiveVersion(
    policyId: string
  ): Promise<PenalizationPolicyVersion | null> {
    return this.versionRepository.findOne({
      where: { policyId, isActive: true },
      relations: ['rules'],
      order: { versionNumber: 'DESC' },
    });
  }
}
