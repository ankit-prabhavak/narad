import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'posts',
})
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  /** Set when this post is a comment on another post. */
  @Prop({ type: Types.ObjectId, ref: 'Post', default: null })
  parentId!: Types.ObjectId | null;

  @Prop({ required: true, maxlength: 5000 })
  text!: string;

  @Prop({ type: String, enum: ['en', 'hi'], default: 'en' })
  language!: 'en' | 'hi';

  /** Derived from the interactions collection; may be reconciled from it. */
  @Prop({ type: Number, default: 0, min: 0 })
  likeCount!: number;

  /** Derived from posts whose parentId points here. */
  @Prop({ type: Number, default: 0, min: 0 })
  replyCount!: number;

  @Prop({ type: Date, default: null })
  editedAt!: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ authorId: 1, _id: -1 });
PostSchema.index({ parentId: 1, _id: 1 });
