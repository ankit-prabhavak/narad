import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChallengeType = 'email_verify' | 'password_reset';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'challenges',
})
export class Challenge {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['email_verify', 'password_reset'],
    required: true,
  })
  type!: ChallengeType;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;

  createdAt!: Date;
}

export type ChallengeDocument = HydratedDocument<Challenge>;
export const ChallengeSchema = SchemaFactory.createForClass(Challenge);
ChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
