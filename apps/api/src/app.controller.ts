import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, SessionUser } from './auth.service';

@Controller()
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'eventrisk-api'
    };
  }

  @Get('auth/login')
  login(@Req() req: Request, @Res() res: Response) {
    if (!this.authService.hasRequiredConfig()) {
      return res.status(500).json({
        error: 'missing_entra_config',
        message: 'Controleer ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET en ENTRA_REDIRECT_URI'
      });
    }

    const state = crypto.randomUUID();
    (req.session as any).oauthState = state;

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
      return res.status(401).json({
        error,
        error_description: errorDescription || 'OAuth authorization failed'
      });
    }

    const expectedState = (req.session as any).oauthState;
    if (!state || !expectedState || state !== expectedState) {
      return res.status(400).json({ error: 'invalid_state' });
    }

    if (!code) {
      return res.status(400).json({ error: 'missing_code' });
    }

    try {
      const tokenResponse = await this.authService.exchangeCodeForTokens(code);
      if (!tokenResponse.id_token) {
        return res.status(400).json({ error: 'missing_id_token' });
      }

      const user: SessionUser = this.authService.mapUserFromIdToken(tokenResponse.id_token);
      (req.session as any).user = user;
      (req.session as any).oauthState = undefined;

      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${redirectUrl}/auth/status`);
    } catch (e: any) {
      return res.status(500).json({
        error: 'token_exchange_failed',
        message: e?.message || 'Unknown error while exchanging code'
      });
    }
  }

  @Get('auth/me')
  me(@Req() req: Request) {
    const user = (req.session as any).user as SessionUser | undefined;

    if (!user) {
      return {
        authenticated: false,
        user: null
      };
    }

    return {
      authenticated: true,
      user
    };
  }

  @Get('admin')
  admin(@Req() req: Request, @Res() res: Response) {
    const user = (req.session as any).user as SessionUser | undefined;

    if (!user) {
      return res.status(401).json({
        error: 'unauthenticated',
        message: 'Login required'
      });
    }

    if (!this.authService.isUserAdmin(user)) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Admin role required',
        requiredRole: process.env.ENTRA_ADMIN_ROLE || 'EventRisk.Admin',
        userRoles: user.roles
      });
    }

    return res.json({
      ok: true,
      message: 'Welcome, admin user',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles
      }
    });
  }

  @Get('auth/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${redirectUrl}/auth/status`);
    });
  }
}
