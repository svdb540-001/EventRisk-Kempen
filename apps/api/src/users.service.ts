import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { SessionUser } from './auth.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromSessionUser(user: SessionUser) {
    const rolesJson = JSON.stringify(user.roles || []);

    return this.prisma.user.upsert({
      where: {
        entraObjectId: user.id
      },
      update: {
        email: user.email,
        name: user.name,
        provider: user.provider,
        rolesJson
      },
      create: {
        entraObjectId: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        rolesJson
      }
    });
  }

  async getProfileByEntraObjectId(entraObjectId: string) {
    return this.prisma.user.findUnique({
      where: { entraObjectId }
    });
  }
}
