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
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
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

export const LoginRequest = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();
export type LoginRequest = z.infer<typeof LoginRequest>;

export const ChangePasswordRequest = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(10).max(128),
  })
  .strict()
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'New password must be different.',
    path: ['newPassword'],
  });
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequest>;

export const VerifyEmailRequest = z.object({ token: z.string().min(20).max(200) }).strict();
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequest>;

export const ForgotPasswordRequest = z
  .object({ email: z.string().trim().toLowerCase().email().max(254) })
  .strict();
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequest>;

export const ResetPasswordRequest = z
  .object({
    token: z.string().min(20).max(200),
    newPassword: z.string().min(10).max(128),
  })
  .strict();
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>;

export const UpdateProfileRequest = z
  .object({
    displayName: z.string().trim().min(1).max(50).optional(),
    bio: z.string().trim().max(160).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update.' });
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;

export const PublicProfile = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  bio: z.string(),
  followersCount: z.number(),
  followingCount: z.number(),
  createdAt: z.string().datetime(),
  isPrivate: z.boolean(),
  viewer: z
    .object({
      following: z.boolean(),
      isSelf: z.boolean(),
      requested: z.boolean(),
      blocking: z.boolean(),
      muting: z.boolean(),
    })
    .nullable(),
});
export type PublicProfile = z.infer<typeof PublicProfile>;

export const ProfileListItem = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
});
export type ProfileListItem = z.infer<typeof ProfileListItem>;

export const ProfilePage = z.object({
  items: z.array(ProfileListItem),
  nextCursor: z.string().nullable(),
});
export type ProfilePage = z.infer<typeof ProfilePage>;

export const UpdatePrivacyRequest = z.object({ isPrivate: z.boolean() }).strict();
export type UpdatePrivacyRequest = z.infer<typeof UpdatePrivacyRequest>;

export const MeResponse = PublicUser.extend({ emailVerified: z.boolean() });
export type MeResponse = z.infer<typeof MeResponse>;

const graphemeCount = (s: string): number =>
  [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].length;

export const PostLanguage = z.enum(['en', 'hi']);
export type PostLanguage = z.infer<typeof PostLanguage>;

const PostText = z
  .string()
  .trim()
  .min(1, 'Write something first.')
  .max(5000)
  .refine((s) => graphemeCount(s) <= 300, { message: 'Posts can be up to 300 characters.' });

export const CreatePostRequest = z
  .object({ text: PostText, language: PostLanguage.default('en') })
  .strict();
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;

export const EditPostRequest = z.object({ text: PostText }).strict();
export type EditPostRequest = z.infer<typeof EditPostRequest>;

export const PostDto = z.object({
  id: z.string(),
  text: z.string(),
  language: PostLanguage,
  createdAt: z.string().datetime(),
  editedAt: z.string().datetime().nullable(),
  parentId: z.string().nullable(),
  likeCount: z.number(),
  replyCount: z.number(),
  author: z.object({ id: z.string(), handle: z.string(), displayName: z.string() }),
  viewer: z.object({ liked: z.boolean(), bookmarked: z.boolean() }).nullable(),
});
export type PostDto = z.infer<typeof PostDto>;

export const PostPage = z.object({
  items: z.array(PostDto),
  nextCursor: z.string().nullable(),
});
export type PostPage = z.infer<typeof PostPage>;
