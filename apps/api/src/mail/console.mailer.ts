import { Logger } from '@nestjs/common';
import type { MailMessage, Mailer } from './mailer';

/** Development only: prints the message to the API log instead of sending it. */
export class ConsoleMailer implements Mailer {
  private readonly logger = new Logger('DevMail');

  send(message: MailMessage): Promise<void> {
    this.logger.log(`To: ${message.to} | ${message.subject}\n${message.text}`);
    return Promise.resolve();
  }
}
