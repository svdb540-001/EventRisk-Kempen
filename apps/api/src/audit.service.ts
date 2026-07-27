import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger('AuditService');

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    const payload = {
      ts: new Date().toISOString(),
      action: input.action,
      userId: input.userId || null,
      email: input.email || null,
      path: input.path || null,
      status: input.status || null,
      metadata: input.metadata || {}
    };

    this.logger.log(JSON.stringify(payload));

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
}
