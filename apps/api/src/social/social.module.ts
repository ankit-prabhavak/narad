import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Follow, FollowSchema } from './follow.schema';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MongooseModule.forFeature([{ name: Follow.name, schema: FollowSchema }]),
  ],
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
