import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'eventrisk-api'
    };
  }

  @Get('auth/me')
  getAuthMePlaceholder() {
    return {
      authenticated: false,
      message: 'Entra ID koppeling volgt in Update 2'
    };
  }
}
