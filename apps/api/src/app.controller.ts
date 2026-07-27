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
import { AuthService, SessionTokens, SessionUser } from './auth.service';
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

  private async ensureFreshTokens(req: Request): Promise<SessionTokens | null> {
    const current = ((req.session as any).tokens || null) as SessionTokens | null;
    if (!current) return null;

    if (!this.authService.isAccessTokenExpired(current)) {
      return current;
    }

    if (!current.refreshToken) {
      return null;
    }

    const refreshed = await this.authService.refreshAccessToken(current.refreshToken);
    const nextTokens = this.authService.toSessionTokens(refreshed);

    (req.session as any).tokens = {
      ...nextTokens,
      refreshToken: refreshed.refresh_token || current.refreshToken
    };

    const user = (req.session as any).user as SessionUser | undefined;
    await this.auditService.log({
      action: 'auth.token.refreshed',
      email: user?.email,
      path: req.path,
      status: 200
    });

    return (req.session as any).tokens;
  }

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
      const tokens = this.authService.toSessionTokens(tokenResponse);

      (req.session as any).user = user;
      (req.session as any).tokens = tokens;
      (req.session as any).oauthState = undefined;

      const dbUser = await this.usersService.upsertFromSessionUser(user);

      await this.auditService.log({
        action: 'auth.callback.success',
        userId: dbUser.id,
        email: user.email,
        path: '/auth/callback',
        status: 302,
        metadata: {
          roles: user.roles,
          entraObjectId: user.id,
          tokenExpiry: tokens.expiresAt
        }
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

    await this.ensureFreshTokens(req);

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
        : null,
      token: {
        expiresAt: ((req.session as any).tokens as SessionTokens | undefined)?.expiresAt || null,
        scope: ((req.session as any).tokens as SessionTokens | undefined)?.scope || null
      }
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

  @UseGuards(RolesGuard)
  @Roles('EventRisk.Admin')
  @Get('admin/audit-logs')
  async adminAuditLogs(
    @Req() req: Request,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('action') action?: string,
    @Query('email') email?: string
  ) {
    const user = (req.session as any).user as SessionUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const configuredRole = this.authService.getAdminRole();
    if (!user.roles.includes(configuredRole)) {
      throw new ForbiddenException('Admin role required');
    }

    const result = await this.auditService.list({
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      action,
      email
    });

    await this.auditService.log({
      action: 'audit.read',
      email: user.email,
      path: '/admin/audit-logs',
      status: 200,
      metadata: {
        take: result.take,
        skip: result.skip,
        filterAction: action || null,
        filterEmail: email || null
      }
    });

    return result;
  }

  @UseGuards(RolesGuard)
  @Roles('EventRisk.Admin')
  @Get('events')
  async listEvents(@Req() req: Request) {
    const user = (req.session as any).user as SessionUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    await this.ensureFreshTokens(req);

    await this.auditService.log({
      action: 'events.read',
      email: user.email,
      path: '/events',
      status: 200
    });

    return {
      items: [
        {
          id: 'evt-001',
          title: 'Chemische lozing kanaal',
          severity: 'high'
        },
        {
          id: 'evt-002',
          title: 'Wateroverlast na storm',
          severity: 'medium'
        }
      ],
      total: 2
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
