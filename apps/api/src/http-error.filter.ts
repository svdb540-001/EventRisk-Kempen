import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuditService } from './audit.service';
import type { SessionUser } from './auth.service';

@Catch()
@Injectable()
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly auditService: AuditService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttp ? exception.getResponse() : null;

    const message = (() => {
      if (!isHttp) return 'Internal server error';
      if (typeof exceptionResponse === 'string') return exceptionResponse;
      if (exceptionResponse && typeof exceptionResponse === 'object') {
        const obj = exceptionResponse as Record<string, any>;
        if (Array.isArray(obj.message)) return obj.message.join(', ');
        if (typeof obj.message === 'string') return obj.message;
      }
      return exception.message;
    })();

    const sessionUser = ((request.session as any)?.user || null) as SessionUser | null;

    await this.auditService.log({
      action: 'http.exception',
      email: sessionUser?.email,
      path: request.path,
      status,
      metadata: {
        method: request.method,
        message
      }
    });

    response.status(status).json({
      error: status === 500 ? 'internal_error' : 'request_failed',
      message,
      statusCode: status,
      path: request.path,
      timestamp: new Date().toISOString()
    });
  }
}
