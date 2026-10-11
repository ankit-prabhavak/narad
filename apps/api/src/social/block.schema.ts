import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'blocks',
})
export class Block {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blockerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blockedId!: Types.ObjectId;

  createdAt!: Date;
}

export const BlockSchema = SchemaFactory.createForClass(Block);
BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
BlockSchema.index({ blockerId: 1, _id: -1 });
