import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthService } from './auth.service';
import { AuditService } from './audit.service';
import { PrismaService } from './prisma.service';
import { UsersService } from './users.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [AuthService, AuditService, PrismaService, UsersService]
})
export class AppModule {}
