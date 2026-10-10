import {
  ArgumentsHost,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

function setup() {
  const out: { status?: number; body?: Record<string, unknown> } = {};
  const res = {
    getHeader: () => 'req-1',
    status: (code: number) => {
      out.status = code;
      return res;
    },
    json: (body: Record<string, unknown>) => {
      out.body = body;
      return res;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { out, host };
}

describe('ApiExceptionFilter', () => {
  it('keeps a custom code and adds the request id', () => {
    const { out, host } = setup();
    new ApiExceptionFilter().catch(
      new ConflictException({ code: 'ACCOUNT_UNAVAILABLE', message: 'nope' }),
      host,
    );
    expect(out.status).toBe(409);
    expect(out.body).toMatchObject({
      statusCode: 409,
      code: 'ACCOUNT_UNAVAILABLE',
      message: 'nope',
      requestId: 'req-1',
    });
  });

  it('maps plain HTTP errors to a code', () => {
    const { out, host } = setup();
    new ApiExceptionFilter().catch(new NotFoundException(), host);
    expect(out.status).toBe(404);
    expect(out.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('hides internal error details from the client', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { out, host } = setup();
    new ApiExceptionFilter().catch(new Error('secret db detail'), host);
    expect(out.status).toBe(500);
    expect(JSON.stringify(out.body)).not.toContain('secret');
    expect(out.body).toMatchObject({
      code: 'INTERNAL_ERROR',
      requestId: 'req-1',
    });
  });
});
