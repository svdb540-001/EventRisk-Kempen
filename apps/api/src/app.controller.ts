import {
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, SessionUser } from './auth.service';
import { AuditService } from './audit.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UsersService } from './users.service';

@Controller()
export class AppController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService
  ) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'eventrisk-api'
    };
  }

  @Get('auth/login')
  async login(@Req() req: Request, @Res() res: Response) {
    if (!this.authService.hasRequiredConfig()) {
      await this.auditService.log({
        action: 'auth.login.failed.missing_config',
        path: '/auth/login',
        status: 500
      });
      return res.status(500).json({
        error: 'missing_entra_config',
        message: 'Controleer ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET en ENTRA_REDIRECT_URI'
      });
    }

    const state = crypto.randomUUID();
    (req.session as any).oauthState = state;

    await this.auditService.log({
      action: 'auth.login.redirect_to_entra',
      path: '/auth/login',
      status: 302
    });

    const url = this.authService.buildAuthorizationUrl(state);
    return res.redirect(url);
  }

  @Get('auth/callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string
  ) {
    if (error) {
      await this.auditService.log({
        action: 'auth.callback.failed.provider_error',
        path: '/auth/callback',
        status: 401,
        metadata: { error }
      });
      return res.status(401).json({
        error,
        error_description: errorDescription || 'OAuth authorization failed'
      });
    }

    const expectedState = (req.session as any).oauthState;
    if (!state || !expectedState || state !== expectedState) {
      await this.auditService.log({
        action: 'auth.callback.failed.invalid_state',
        path: '/auth/callback',
        status: 400
      });
      return res.status(400).json({ error: 'invalid_state' });
    }

    if (!code) {
      await this.auditService.log({
        action: 'auth.callback.failed.missing_code',
        path: '/auth/callback',
        status: 400
      });
      return res.status(400).json({ error: 'missing_code' });
    }

    try {
      const tokenResponse = await this.authService.exchangeCodeForTokens(code);
      if (!tokenResponse.id_token) {
        await this.auditService.log({
          action: 'auth.callback.failed.missing_id_token',
          path: '/auth/callback',
          status: 400
        });
        return res.status(400).json({ error: 'missing_id_token' });
      }

      const user: SessionUser = this.authService.mapUserFromIdToken(tokenResponse.id_token);
      (req.session as any).user = user;
      (req.session as any).oauthState = undefined;

      const dbUser = await this.usersService.upsertFromSessionUser(user);

      await this.auditService.log({
        action: 'auth.callback.success',
        userId: dbUser.id,
        email: user.email,
        path: '/auth/callback',
        status: 302,
        metadata: { roles: user.roles, entraObjectId: user.id }
      });

      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${redirectUrl}/auth/status`);
    } catch (e: any) {
      await this.auditService.log({
        action: 'auth.callback.failed.token_exchange',
        path: '/auth/callback',
        status: 500,
        metadata: { message: e?.message || 'unknown' }
      });
      return res.status(500).json({
        error: 'token_exchange_failed',
        message: e?.message || 'Unknown error while exchanging code'
      });
    }
  }

  @Get('auth/me')
  async me(@Req() req: Request) {
    const user = (req.session as any).user as SessionUser | undefined;

    if (!user) {
      return {
        authenticated: false,
        user: null
      };
    }

    const profile = await this.usersService.getProfileByEntraObjectId(user.id);

    return {
      authenticated: true,
      user,
      profile: profile
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            roles: JSON.parse(profile.rolesJson || '[]'),
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt
          }
        : null
    };
  }

  @UseGuards(RolesGuard)
  @Roles('EventRisk.Admin')
  @Get('admin')
  async admin(@Req() req: Request) {
    const user = (req.session as any).user as SessionUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const configuredRole = this.authService.getAdminRole();
    const hasConfiguredRole = user.roles.includes(configuredRole);

    if (!hasConfiguredRole) {
      await this.auditService.log({
        action: 'authz.admin.denied',
        email: user.email,
        path: '/admin',
        status: 403,
        metadata: {
          requiredRole: configuredRole,
          userRoles: user.roles,
          entraObjectId: user.id
        }
      });
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Admin role required',
        requiredRole: configuredRole,
        userRoles: user.roles
      });
    }

    const profile = await this.usersService.getProfileByEntraObjectId(user.id);

    await this.auditService.log({
      action: 'authz.admin.allowed',
      userId: profile?.id,
      email: user.email,
      path: '/admin',
      status: 200,
      metadata: {
        requiredRole: configuredRole,
        userRoles: user.roles,
        entraObjectId: user.id
      }
    });

    return {
      ok: true,
      message: 'Welcome, admin user',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles
      },
      profile: profile
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            roles: JSON.parse(profile.rolesJson || '[]')
          }
        : null
    };
  }

  @Get('auth/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const user = (req.session as any).user as SessionUser | undefined;

    req.session.destroy(async (err) => {
      if (err) {
        await this.auditService.log({
          action: 'auth.logout.failed',
          email: user?.email,
          path: '/auth/logout',
          status: 500,
          metadata: { error: err.message, entraObjectId: user?.id }
        });
        throw new InternalServerErrorException('Logout failed');
      }

      await this.auditService.log({
        action: 'auth.logout.success',
        email: user?.email,
        path: '/auth/logout',
        status: 302,
        metadata: { entraObjectId: user?.id }
      });

      res.clearCookie('eventrisk.sid');
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${redirectUrl}/auth/status`);
    });
  }
}
