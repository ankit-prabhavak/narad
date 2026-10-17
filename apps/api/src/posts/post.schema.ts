import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'posts',
})
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({ required: true, maxlength: 5000 })
  text!: string;

  @Prop({ type: String, enum: ['en', 'hi'], default: 'en' })
  language!: 'en' | 'hi';

  @Prop({ type: Date, default: null })
  editedAt!: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ authorId: 1, _id: -1 });
