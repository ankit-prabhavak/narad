export const MEDIA_PREFIX = '/api/v1/media/';

export const mediaUrl = (key: string): string => MEDIA_PREFIX + key;

export const avatarUrl = (key: string | null | undefined): string | null =>
  key ? mediaUrl(key) : null;
