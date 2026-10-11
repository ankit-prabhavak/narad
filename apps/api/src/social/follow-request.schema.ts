import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'follow_requests',
})
export class FollowRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  targetId!: Types.ObjectId;

  createdAt!: Date;
}

export const FollowRequestSchema = SchemaFactory.createForClass(FollowRequest);
FollowRequestSchema.index({ requesterId: 1, targetId: 1 }, { unique: true });
FollowRequestSchema.index({ targetId: 1, _id: -1 });
