import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { Block, BlockSchema } from '../social/block.schema';
import { Follow, FollowSchema } from '../social/follow.schema';
import { Mute, MuteSchema } from '../social/mute.schema';
import { UsersModule } from '../users/users.module';
import { Interaction, InteractionSchema } from './interaction.schema';
import { Post, PostSchema } from './post.schema';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MediaModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Interaction.name, schema: InteractionSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Block.name, schema: BlockSchema },
      { name: Mute.name, schema: MuteSchema },
    ]),
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
