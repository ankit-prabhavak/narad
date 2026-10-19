import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type AuthedRequest, SessionGuard } from '../auth/session.guard';
import { RateLimitService } from '../redis/rate-limit.service';
import { MediaAssetService } from './media-asset.service';

const MAX_BYTES = 5 * 1024 * 1024;

function requireUserId(req: AuthedRequest): string {
  const id = req.auth?.user.id;
  if (!id)
    throw new UnauthorizedException({
      code: 'UNAUTHENTICATED',
      message: 'Please sign in.',
    });
  return id;
}

@Controller()
export class PostImageController {
  constructor(
    private readonly assets: MediaAssetService,
    private readonly limiter: RateLimitService,
  ) {}

  @Post('media/images')
  @UseGuards(SessionGuard)
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_BYTES, files: 1 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: AuthedRequest,
  ) {
    const me = requireUserId(req);
    await this.limiter.hit(`mediaupload:user:${me}`, 60, 3600);
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE',
        message: 'Choose an image to upload.',
      });
    }
    return this.assets.upload(me, file.buffer);
  }

  @Delete('media/images/:id')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.assets.deleteOwnedPending(requireUserId(req), id);
  }
}
