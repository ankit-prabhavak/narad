import { z } from 'zod';

export const HealthResponse = z.object({
  status: z.literal('ok'),
  service: z.string(),
  time: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const ApiError = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiError>;
