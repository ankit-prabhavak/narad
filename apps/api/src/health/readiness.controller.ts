import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { type Connection, ConnectionStates } from 'mongoose';

@Controller('health')
export class ReadinessController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get('ready')
  async ready() {
    try {
      if (this.conn.readyState !== ConnectionStates.connected)
        throw new Error('not connected');
      await this.conn.db?.admin().ping();
      return { status: 'ready', mongo: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        mongo: 'down',
      });
    }
  }
}
