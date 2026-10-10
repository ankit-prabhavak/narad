import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  503: 'UNAVAILABLE',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = res.getHeader('x-request-id');

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong.';
    let issues: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = CODE_BY_STATUS[status] ?? 'ERROR';
      message = exception.message;
      const body = exception.getResponse();
      if (typeof body === 'object') {
        const b = body as {
          code?: unknown;
          message?: unknown;
          issues?: unknown;
        };
        if (typeof b.code === 'string') code = b.code;
        if (typeof b.message === 'string') message = b.message;
        if (Array.isArray(b.issues)) issues = b.issues;
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : 'Non-error thrown',
      );
    }

    res.status(status).json({
      statusCode: status,
      code,
      message,
      ...(issues ? { issues } : {}),
      requestId: typeof requestId === 'string' ? requestId : undefined,
    });
  }
}
