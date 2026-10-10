import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { env } from '../config/env';
import { CSRF_SECRET } from './csrf';
import { CsrfGuard } from './csrf.guard';

@Global()
@Module({
  providers: [
    { provide: CSRF_SECRET, useFactory: () => env.SESSION_SECRET },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [CSRF_SECRET],
})
export class CsrfModule {}
