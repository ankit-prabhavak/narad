import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'mutes',
})
export class Mute {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  muterId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  mutedId!: Types.ObjectId;

  createdAt!: Date;
}

export const MuteSchema = SchemaFactory.createForClass(Mute);
MuteSchema.index({ muterId: 1, mutedId: 1 }, { unique: true });
MuteSchema.index({ muterId: 1, _id: -1 });
