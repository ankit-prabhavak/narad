import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  handle!: string;

  @Prop({ required: true, trim: true, maxlength: 50 })
  displayName!: string;

  @Prop({ type: String, trim: true, maxlength: 160, default: '' })
  bio!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: Boolean, default: false })
  emailVerified!: boolean;

  @Prop({ type: Boolean, default: false })
  isPrivate!: boolean;

  @Prop({
    type: [String],
    default: ['en'],
    validate: (v: string[]) => v.length <= 5,
  })
  preferredLanguages!: string[];

  @Prop({ type: String, enum: ['user', 'moderator', 'admin'], default: 'user' })
  role!: 'user' | 'moderator' | 'admin';

  /** Derived from the follows collection; may be reconciled from it. */
  @Prop({ type: Number, default: 0, min: 0 })
  followersCount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  followingCount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
