import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  provider: 'entra';
}

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'eventrisk-api'
    };
  }

  @Get('auth/login')
  login(@Req() req: Request, @Res() res: Response) {
    // Placeholder flow voor Update 2: simuleert Entra login resultaat
    const user: SessionUser = {
      id: 'entra-demo-user',
      name: 'Demo User',
      email: 'demo.user@eventrisk.local',
      provider: 'entra'
    };

    (req.session as any).user = user;

    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${redirectUrl}/auth/status`);
  }

  @Get('auth/callback')
  callback(@Req() req: Request, @Res() res: Response) {
    // Callback placeholder zolang echte OAuth code exchange nog niet actief is
    if (!(req.session as any).user) {
      (req.session as any).user = {
        id: 'entra-callback-user',
        name: 'Callback User',
        email: 'callback.user@eventrisk.local',
        provider: 'entra'
      } as SessionUser;
    }

    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${redirectUrl}/auth/status`);
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

  @Get('auth/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${redirectUrl}/auth/status`);
    });
  }
}
