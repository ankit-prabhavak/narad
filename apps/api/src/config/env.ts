import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url(),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z
    .string()
    .regex(
      /^[0-9a-f]{64}$/,
      'SESSION_SECRET must be 64 hex chars (openssl rand -hex 32)',
    ),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
