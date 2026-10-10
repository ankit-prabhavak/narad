import type { PublicUser } from '@narad/contracts';

export function toPublicUser(doc: {
  id: string;
  handle: string;
  displayName: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: doc.id,
    handle: doc.handle,
    displayName: doc.displayName,
    createdAt: doc.createdAt.toISOString(),
  };
}
