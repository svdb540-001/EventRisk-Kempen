import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthService } from './auth.service';
import { AuditService } from './audit.service';
import { PrismaService } from './prisma.service';
import { UsersService } from './users.service';
import { HttpErrorFilter } from './http-error.filter';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [
    AuthService,
    AuditService,
    PrismaService,
    UsersService,
    {
      provide: APP_FILTER,
      useClass: HttpErrorFilter
    }
  ]
})
export class AppModule {}
