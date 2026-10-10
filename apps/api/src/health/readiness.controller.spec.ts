import { ServiceUnavailableException } from '@nestjs/common';
import { type Connection, ConnectionStates } from 'mongoose';
import { ReadinessController } from './readiness.controller';

const fakeConn = (readyState: ConnectionStates, ping: () => Promise<unknown>) =>
  ({ readyState, db: { admin: () => ({ ping }) } }) as unknown as Connection;

describe('ReadinessController', () => {
  it('reports ready when Mongo answers a ping', async () => {
    const c = new ReadinessController(
      fakeConn(ConnectionStates.connected, () => Promise.resolve({ ok: 1 })),
    );
    await expect(c.ready()).resolves.toEqual({ status: 'ready', mongo: 'up' });
  });

  it('returns 503 when Mongo is disconnected', async () => {
    const c = new ReadinessController(
      fakeConn(ConnectionStates.disconnected, () => Promise.resolve({ ok: 1 })),
    );
    await expect(c.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns 503 when the ping fails', async () => {
    const c = new ReadinessController(
      fakeConn(ConnectionStates.connected, () =>
        Promise.reject(new Error('boom')),
      ),
    );
    await expect(c.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
