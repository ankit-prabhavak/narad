import { Module } from '@nestjs/common';
import { env } from '../config/env';
import { ConsoleMailer } from './console.mailer';
import { MAILER, type Mailer } from './mailer';

@Module({
  providers: [
    {
      provide: MAILER,
      useFactory: (): Mailer => {
        if (env.NODE_ENV === 'production') {
          throw new Error('No mail provider is configured for production.');
        }
        return new ConsoleMailer();
      },
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
