import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type { PublicUser } from '@narad/contracts';
import { User } from '../users/user.schema';
import { toPublicUser } from '../users/public-user';
import { Session } from './session.schema';
import { hashToken, newToken, SESSION_TTL_MS } from './session.token';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async create(userId: string, userAgent?: string) {
    const token = newToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessions.create({
      userId: new Types.ObjectId(userId),
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: userAgent?.slice(0, 200),
    });
    return { token, expiresAt };
  }

  async resolve(
    token: string,
  ): Promise<{ sessionId: string; user: PublicUser } | null> {
    const session = await this.sessions
      .findOne({
        tokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();
    if (!session) return null;
    const user = await this.users.findById(session.userId).exec();
    if (!user) return null;
    return { sessionId: session.id, user: toPublicUser(user) };
  }

  async revoke(token: string): Promise<void> {
    await this.sessions
      .updateOne(
        { tokenHash: hashToken(token), revokedAt: null },
        { revokedAt: new Date() },
      )
      .exec();
  }
}
