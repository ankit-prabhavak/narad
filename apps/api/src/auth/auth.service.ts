import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import type { Model } from 'mongoose';
import type { PublicUser, RegisterRequest } from '@narad/contracts';
import { User } from '../users/user.schema';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async register(input: RegisterRequest): Promise<PublicUser> {
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });
    try {
      const doc = await this.users.create({
        email: input.email,
        handle: input.handle,
        displayName: input.displayName,
        passwordHash,
      });
      return {
        id: doc.id,
        handle: doc.handle,
        displayName: doc.displayName,
        createdAt: doc.createdAt.toISOString(),
      };
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException({
          code: 'ACCOUNT_UNAVAILABLE',
          message: 'That email or handle is unavailable.',
        });
      }
      throw err;
    }
  }
}
