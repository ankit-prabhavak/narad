import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Block, BlockSchema } from './block.schema';
import { FollowRequest, FollowRequestSchema } from './follow-request.schema';
import { Follow, FollowSchema } from './follow.schema';
import { Mute, MuteSchema } from './mute.schema';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: Follow.name, schema: FollowSchema },
      { name: Block.name, schema: BlockSchema },
      { name: Mute.name, schema: MuteSchema },
      { name: FollowRequest.name, schema: FollowRequestSchema },
    ]),
  ],
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
