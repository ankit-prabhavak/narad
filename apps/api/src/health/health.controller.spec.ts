import { HealthResponse } from '@narad/contracts';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a response that satisfies the shared contract', () => {
    const result = new HealthController().check();
    expect(() => HealthResponse.parse(result)).not.toThrow();
    expect(result.status).toBe('ok');
  });
});
