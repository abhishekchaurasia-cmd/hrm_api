import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';

import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-response.interface.js';
import { paginate } from '../../common/utils/paginate.js';
import { User } from '../users/entities/user.entity.js';

import type { CreateTimeTrackingPolicyDto } from './dto/create-time-tracking-policy.dto.js';
import type { UpdateTimeTrackingPolicyDto } from './dto/update-time-tracking-policy.dto.js';
import { TimeTrackingPolicyAssignment } from './entities/time-tracking-policy-assignment.entity.js';
import { TimeTrackingPolicy } from './entities/time-tracking-policy.entity.js';
import {
  DEFAULT_ADJUSTMENT_SETTINGS,
  DEFAULT_APPROVAL_SETTINGS,
  DEFAULT_CAPTURE_SETTINGS,
  DEFAULT_PARTIAL_DAY_SETTINGS,
  DEFAULT_REGULARIZATION_SETTINGS,
} from './types/time-tracking-policy.types.js';
import type {
  ApprovalSettings,
  CaptureSettings,
} from './types/time-tracking-policy.types.js';

export interface TimeTrackingPolicyWithCount extends TimeTrackingPolicy {
  employeeCount?: number;
}

@Injectable()
export class TimeTrackingPoliciesService {
  constructor(
    @InjectRepository(TimeTrackingPolicy)
    private readonly policyRepository: Repository<TimeTrackingPolicy>,
    @InjectRepository(TimeTrackingPolicyAssignment)
    private readonly assignmentRepository: Repository<TimeTrackingPolicyAssignment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource
  ) {}

  async create(
    dto: CreateTimeTrackingPolicyDto
  ): Promise<ApiResponse<TimeTrackingPolicy>> {
    const result = await this.dataSource.transaction(async manager => {
      if (dto.isDefault) {
        await manager.update(
          TimeTrackingPolicy,
          { isDefault: true, isActive: true },
          { isDefault: false }
        );
      }

      const policy = manager.create(TimeTrackingPolicy, {
        name: dto.name,
        description: dto.description ?? null,
        isDefault: dto.isDefault ?? false,
        captureSettings: dto.captureSettings
          ? this.normalizeCaptureSettings(dto.captureSettings)
          : DEFAULT_CAPTURE_SETTINGS,
        wfhAllowed: dto.wfhAllowed ?? false,
        wfhApprovalRequired: dto.wfhApprovalRequired ?? false,
        onDutyAllowed: dto.onDutyAllowed ?? false,
        partialDaySettings:
          dto.partialDaySettings ?? DEFAULT_PARTIAL_DAY_SETTINGS,
        adjustmentSettings:
          dto.adjustmentSettings ?? DEFAULT_ADJUSTMENT_SETTINGS,
        regularizationSettings:
          dto.regularizationSettings ?? DEFAULT_REGULARIZATION_SETTINGS,
        approvalSettings: dto.approvalSettings
          ? this.normalizeApprovalSettings(dto.approvalSettings)
          : DEFAULT_APPROVAL_SETTINGS,
      });

      return manager.save(TimeTrackingPolicy, policy);
    });

    return {
      success: true,
      message: 'Time tracking policy created',
      data: result,
    };
  }

  async findAll(): Promise<ApiResponse<TimeTrackingPolicyWithCount[]>> {
    const policies = await this.policyRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    const enriched: TimeTrackingPolicyWithCount[] = [];
    for (const policy of policies) {
      const employeeCount = await this.assignmentRepository.count({
        where: { policyId: policy.id, isActive: true },
      });
      enriched.push({ ...policy, employeeCount });
    }

    return {
      success: true,
      message: 'Time tracking policies retrieved',
      data: enriched,
    };
  }

  async findOne(id: string): Promise<ApiResponse<TimeTrackingPolicyWithCount>> {
    const policy = await this.policyRepository.findOne({
      where: { id },
    });
    if (!policy) {
      throw new NotFoundException(
        `Time tracking policy with ID "${id}" not found`
      );
    }

    const employeeCount = await this.assignmentRepository.count({
      where: { policyId: id, isActive: true },
    });

    return {
      success: true,
      message: 'Time tracking policy retrieved',
      data: { ...policy, employeeCount },
    };
  }

  async update(
    id: string,
    dto: UpdateTimeTrackingPolicyDto
  ): Promise<ApiResponse<TimeTrackingPolicy>> {
    const result = await this.dataSource.transaction(async manager => {
      const policy = await manager.findOne(TimeTrackingPolicy, {
        where: { id },
      });
      if (!policy) {
        throw new NotFoundException(
          `Time tracking policy with ID "${id}" not found`
        );
      }

      if (dto.isDefault === true && !policy.isDefault) {
        await manager.update(
          TimeTrackingPolicy,
          { isDefault: true, isActive: true, id: Not(id) },
          { isDefault: false }
        );
      }

      if (dto.name !== undefined) {
        policy.name = dto.name;
      }
      if (dto.description !== undefined) {
        policy.description = dto.description ?? null;
      }
      if (dto.isDefault !== undefined) {
        policy.isDefault = dto.isDefault;
      }
      if (dto.captureSettings !== undefined) {
        policy.captureSettings = this.normalizeCaptureSettings(
          dto.captureSettings
        );
      }
      if (dto.wfhAllowed !== undefined) {
        policy.wfhAllowed = dto.wfhAllowed;
      }
      if (dto.wfhApprovalRequired !== undefined) {
        policy.wfhApprovalRequired = dto.wfhApprovalRequired;
      }
      if (dto.onDutyAllowed !== undefined) {
        policy.onDutyAllowed = dto.onDutyAllowed;
      }
      if (dto.partialDaySettings !== undefined) {
        policy.partialDaySettings = dto.partialDaySettings;
      }
      if (dto.adjustmentSettings !== undefined) {
        policy.adjustmentSettings = dto.adjustmentSettings;
      }
      if (dto.regularizationSettings !== undefined) {
        policy.regularizationSettings = dto.regularizationSettings;
      }
      if (dto.approvalSettings !== undefined) {
        policy.approvalSettings = this.normalizeApprovalSettings(
          dto.approvalSettings
        );
      }

      return manager.save(TimeTrackingPolicy, policy);
    });

    return {
      success: true,
      message: 'Time tracking policy updated',
      data: result,
    };
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const policy = await this.policyRepository.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException(
        `Time tracking policy with ID "${id}" not found`
      );
    }

    policy.isActive = false;
    await this.policyRepository.save(policy);

    return {
      success: true,
      message: 'Time tracking policy deactivated',
      data: null,
    };
  }

  async assign(
    policyId: string,
    userIds: string[]
  ): Promise<ApiResponse<TimeTrackingPolicyAssignment[]>> {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId, isActive: true },
    });
    if (!policy) {
      throw new NotFoundException(
        `Time tracking policy with ID "${policyId}" not found`
      );
    }

    const users = await this.userRepository.find({
      where: { id: In(userIds), isActive: true },
    });
    if (users.length !== userIds.length) {
      const foundIds = new Set(users.map(u => u.id));
      const missing = userIds.filter(uid => !foundIds.has(uid));
      throw new BadRequestException(
        `Users not found or inactive: ${missing.join(', ')}`
      );
    }

    const saved: TimeTrackingPolicyAssignment[] = [];

    for (const userId of userIds) {
      const existing = await this.assignmentRepository.findOne({
        where: { policyId, userId },
      });

      if (existing) {
        if (existing.isActive) {
          continue;
        }
        existing.isActive = true;
        existing.unassignedAt = null;
        const updated = await this.assignmentRepository.save(existing);
        saved.push(updated);
      } else {
        const assignment = this.assignmentRepository.create({
          policyId,
          userId,
          isActive: true,
        });
        const created = await this.assignmentRepository.save(assignment);
        saved.push(created);
      }
    }

    return {
      success: true,
      message: `${saved.length} employee(s) assigned to policy`,
      data: saved,
    };
  }

  async findAssignments(
    policyId: string,
    pagination: PaginationQueryDto
  ): Promise<ApiResponse<PaginatedResult<TimeTrackingPolicyAssignment>>> {
    const { page, limit } = pagination;
    const policy = await this.policyRepository.findOne({
      where: { id: policyId },
    });
    if (!policy) {
      throw new NotFoundException(
        `Time tracking policy with ID "${policyId}" not found`
      );
    }

    const [items, total] = await this.assignmentRepository.findAndCount({
      where: { policyId, isActive: true },
      relations: ['user'],
      order: { assignedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Policy assignments retrieved',
      data: paginate(items, total, page, limit),
    };
  }

  async unassign(
    policyId: string,
    assignmentId: string
  ): Promise<ApiResponse<null>> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, policyId },
    });
    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID "${assignmentId}" not found`
      );
    }

    assignment.isActive = false;
    assignment.unassignedAt = new Date();
    await this.assignmentRepository.save(assignment);

    return {
      success: true,
      message: 'Employee unassigned from policy',
      data: null,
    };
  }

  async getActivePolicyForUser(
    userId: string
  ): Promise<TimeTrackingPolicy | null> {
    const assignment = await this.assignmentRepository.findOne({
      where: { userId, isActive: true },
      relations: ['policy'],
      order: { assignedAt: 'DESC' },
    });

    if (assignment?.policy?.isActive) {
      return assignment.policy;
    }

    const defaultPolicy = await this.policyRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    return defaultPolicy ?? null;
  }

  private normalizeCaptureSettings(
    dto: NonNullable<CreateTimeTrackingPolicyDto['captureSettings']>
  ): CaptureSettings {
    return {
      biometricEnabled: dto.biometricEnabled,
      webClockIn: {
        enabled: dto.webClockIn.enabled,
        commentMandatory: dto.webClockIn.commentMandatory,
        ipRestrictionEnabled: dto.webClockIn.ipRestrictionEnabled,
        allowedIPs: dto.webClockIn.allowedIPs ?? [],
      },
      remoteClockIn: {
        enabled: dto.remoteClockIn.enabled,
        capturesLocation: dto.remoteClockIn.capturesLocation,
        ipRestrictionEnabled: dto.remoteClockIn.ipRestrictionEnabled,
        allowedIPs: dto.remoteClockIn.allowedIPs ?? [],
      },
      mobileClockIn: {
        enabled: dto.mobileClockIn.enabled,
      },
    };
  }

  private normalizeApprovalSettings(
    dto: NonNullable<CreateTimeTrackingPolicyDto['approvalSettings']>
  ): ApprovalSettings {
    return {
      enabled: dto.enabled,
      thresholdCount: dto.thresholdCount,
      thresholdPeriod: dto.thresholdPeriod,
      levels: (dto.levels ?? []).map(l => ({
        level: l.level,
        assigneeType: l.assigneeType,
      })),
      autoApproveIfMissing: dto.autoApproveIfMissing,
      skipApprovalForEveryRequest: dto.skipApprovalForEveryRequest,
    };
  }
}
