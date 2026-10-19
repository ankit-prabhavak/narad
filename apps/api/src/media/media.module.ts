import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { ImageService } from './image.service';
import { MediaController } from './media.controller';
import { StorageModule } from './storage.module';

@Module({
  imports: [UsersModule, AuthModule, StorageModule],
  controllers: [AvatarController, MediaController],
  providers: [ImageService, AvatarService],
})
export class MediaModule {}
