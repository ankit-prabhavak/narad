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

export const Handle = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'Handle must be 3-20 characters: a-z, 0-9, underscore');

export const RegisterRequest = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    handle: Handle,
    displayName: z.string().trim().min(1).max(50),
    password: z.string().min(10).max(128),
  })
  .strict();
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const PublicUser = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  createdAt: z.string().datetime(),
});
export type PublicUser = z.infer<typeof PublicUser>;
