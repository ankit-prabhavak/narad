import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import type { Model } from 'mongoose';
import type {
  LoginRequest,
  PublicUser,
  RegisterRequest,
} from '@narad/contracts';
import { toPublicUser } from '../users/public-user';
import { User } from '../users/user.schema';

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

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
      return toPublicUser(doc);
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

  async login(input: LoginRequest): Promise<PublicUser> {
    const user = await this.users
      .findOne({ email: input.email })
      .select('+passwordHash')
      .exec();
    // Always run a verify, so unknown emails cost the same time as wrong passwords.
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await argon2.verify(hash, input.password);
    if (!user || !valid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      });
    }
    return toPublicUser(user);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash(randomBytes(16).toString('hex'), {
      type: argon2.argon2id,
    });
    return this.dummyHash;
  }
}
