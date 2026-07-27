import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

interface AuditLogInput {
  action: string;
  userId?: string;
  email?: string;
  path?: string;
  status?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId,
        email: input.email,
        path: input.path,
        status: input.status,
        metadata: JSON.stringify(input.metadata || {})
      }
    });
  }

  async list(params: {
    take?: number;
    skip?: number;
    action?: string;
    email?: string;
  }) {
    const take = Math.min(Math.max(params.take ?? 20, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);

    const where = {
      ...(params.action ? { action: params.action } : {}),
      ...(params.email ? { email: params.email } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      total,
      take,
      skip,
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        userId: item.userId,
        email: item.email,
        path: item.path,
        status: item.status,
        metadata: item.metadata ? JSON.parse(item.metadata) : {},
        createdAt: item.createdAt
      }))
    };
  }
}
