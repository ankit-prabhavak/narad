import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'media_assets',
})
export class MediaAsset {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true })
  width!: number;

  @Prop({ required: true })
  height!: number;

  @Prop({ required: true })
  bytes!: number;

  /** Null until the image is attached to a post or comment. */
  @Prop({ type: Types.ObjectId, ref: 'Post', default: null })
  postId!: Types.ObjectId | null;

  createdAt!: Date;
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
MediaAssetSchema.index({ ownerId: 1, postId: 1 });
MediaAssetSchema.index({ postId: 1, createdAt: 1 });
