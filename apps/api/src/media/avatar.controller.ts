import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  Put,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type AuthedRequest, SessionGuard } from '../auth/session.guard';
import { RateLimitService } from '../redis/rate-limit.service';
import { AvatarService } from './avatar.service';

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
export class AvatarController {
  constructor(
    private readonly avatars: AvatarService,
    private readonly limiter: RateLimitService,
  ) {}

  @Put('me/avatar')
  @UseGuards(SessionGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_BYTES, files: 1 } }),
  )
  async set(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: AuthedRequest,
  ) {
    const me = requireUserId(req);
    await this.limiter.hit(`avatar:user:${me}`, 20, 3600);
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE',
        message: 'Choose an image to upload.',
      });
    }
    return this.avatars.set(me, file.buffer);
  }

  @Delete('me/avatar')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async remove(@Req() req: AuthedRequest) {
    await this.avatars.remove(requireUserId(req));
  }
}
