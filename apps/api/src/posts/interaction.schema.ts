import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type InteractionType = 'like' | 'bookmark' | 'repost';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'interactions',
})
export class Interaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId!: Types.ObjectId;

  @Prop({ type: String, enum: ['like', 'bookmark', 'repost'], required: true })
  type!: InteractionType;

  createdAt!: Date;
}

export const InteractionSchema = SchemaFactory.createForClass(Interaction);
InteractionSchema.index({ userId: 1, postId: 1, type: 1 }, { unique: true });
InteractionSchema.index({ postId: 1, type: 1 });
InteractionSchema.index({ userId: 1, type: 1, _id: -1 });
