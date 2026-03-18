import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { User } from '../users/entities/user.entity.js';

import { PenalizationPolicyAssignment } from './entities/penalization-policy-assignment.entity.js';
import { PenalizationPolicy } from './entities/penalization-policy.entity.js';

@Injectable()
export class PenalizationAssignmentsService {
  constructor(
    @InjectRepository(PenalizationPolicyAssignment)
    private readonly assignmentRepository: Repository<PenalizationPolicyAssignment>,
    @InjectRepository(PenalizationPolicy)
    private readonly policyRepository: Repository<PenalizationPolicy>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async assign(
    policyId: string,
    userIds: string[]
  ): Promise<ApiResponse<PenalizationPolicyAssignment[]>> {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId, isActive: true },
    });
    if (!policy) {
      throw new NotFoundException(
        `Penalization policy with ID "${policyId}" not found`
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

    const saved: PenalizationPolicyAssignment[] = [];

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

  async findByPolicy(
    policyId: string
  ): Promise<ApiResponse<PenalizationPolicyAssignment[]>> {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId },
    });
    if (!policy) {
      throw new NotFoundException(
        `Penalization policy with ID "${policyId}" not found`
      );
    }

    const assignments = await this.assignmentRepository.find({
      where: { policyId, isActive: true },
      relations: ['user'],
      order: { assignedAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Policy assignments retrieved',
      data: assignments,
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
  ): Promise<PenalizationPolicyAssignment | null> {
    return this.assignmentRepository.findOne({
      where: { userId, isActive: true },
      relations: ['policy'],
      order: { assignedAt: 'DESC' },
    });
  }
}
