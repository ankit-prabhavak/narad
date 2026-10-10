import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { Challenge, type ChallengeType } from './challenge.schema';
import { hashToken, newToken } from './session.token';

const TTL_MS: Record<ChallengeType, number> = {
  email_verify: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
};

@Injectable()
export class ChallengeService {
  constructor(
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
  ) {}

  /** Creates a fresh token and invalidates any unused earlier ones of the same type. */
  async issue(userId: string, type: ChallengeType): Promise<string> {
    const owner = new Types.ObjectId(userId);
    await this.challenges
      .updateMany({ userId: owner, type, usedAt: null }, { usedAt: new Date() })
      .exec();
    const token = newToken();
    await this.challenges.create({
      userId: owner,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_MS[type]),
    });
    return token;
  }

  /** Atomically claims a valid token. Returns the user id, or null if invalid, used or expired. */
  async consume(token: string, type: ChallengeType): Promise<string | null> {
    const doc = await this.challenges
      .findOneAndUpdate(
        {
          tokenHash: hashToken(token),
          type,
          usedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { usedAt: new Date() },
      )
      .exec();
    return doc ? doc.userId.toString() : null;
  }
}
