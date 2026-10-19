import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { ImageService } from './image.service';
import { MediaAssetService } from './media-asset.service';
import { MediaAsset, MediaAssetSchema } from './media-asset.schema';
import { MediaCleanup } from './media-cleanup';
import { MediaController } from './media.controller';
import { PostImageController } from './post-image.controller';
import { StorageModule } from './storage.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    StorageModule,
    MongooseModule.forFeature([
      { name: MediaAsset.name, schema: MediaAssetSchema },
    ]),
  ],
  controllers: [AvatarController, MediaController, PostImageController],
  providers: [ImageService, AvatarService, MediaAssetService, MediaCleanup],
  exports: [MediaAssetService],
})
export class MediaModule {}
