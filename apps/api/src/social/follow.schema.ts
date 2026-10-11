import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'follows',
})
export class Follow {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  followerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  followeeId!: Types.ObjectId;

  createdAt!: Date;
}

export type FollowDocument = HydratedDocument<Follow>;
export const FollowSchema = SchemaFactory.createForClass(Follow);
FollowSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });
FollowSchema.index({ followeeId: 1, _id: -1 });
FollowSchema.index({ followerId: 1, _id: -1 });
