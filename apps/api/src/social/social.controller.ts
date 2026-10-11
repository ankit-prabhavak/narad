import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UpdateProfileRequest, Handle } from '@narad/contracts';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { type AuthedRequest, SessionGuard } from '../auth/session.guard';
import { parseBody } from '../common/parse-body';
import { RateLimitService } from '../redis/rate-limit.service';
import { SocialService } from './social.service';

function requireUserId(req: AuthedRequest): string {
  const id = req.auth?.user.id;
  if (!id)
    throw new UnauthorizedException({
      code: 'UNAUTHENTICATED',
      message: 'Please sign in.',
    });
  return id;
}

function handleParam(raw: string): string {
  const parsed = Handle.safeParse(raw);
  return parsed.success ? parsed.data : '__invalid__';
}

@Controller()
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly limiter: RateLimitService,
  ) {}

  @Get('users/:handle')
  @UseGuards(OptionalSessionGuard)
  profile(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    return this.social.getProfile(
      handleParam(handle),
      req.auth?.user.id ?? null,
    );
  }

  @Patch('me/profile')
  @UseGuards(SessionGuard)
  updateProfile(@Body() body: unknown, @Req() req: AuthedRequest) {
    const input = parseBody(
      UpdateProfileRequest,
      body,
      'Invalid profile data.',
    );
    return this.social.updateProfile(requireUserId(req), input);
  }

  @Post('users/:handle/follow')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async follow(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    const me = requireUserId(req);
    await this.limiter.hit(`follow:user:${me}`, 100, 3600);
    await this.social.follow(me, handleParam(handle));
  }

  @Delete('users/:handle/follow')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async unfollow(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    const me = requireUserId(req);
    await this.limiter.hit(`follow:user:${me}`, 100, 3600);
    await this.social.unfollow(me, handleParam(handle));
  }

  @Get('users/:handle/followers')
  followers(
    @Param('handle') handle: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.social.listFollowers(
      handleParam(handle),
      cursor ?? null,
      Number(limit ?? 20),
    );
  }

  @Get('users/:handle/following')
  following(
    @Param('handle') handle: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.social.listFollowing(
      handleParam(handle),
      cursor ?? null,
      Number(limit ?? 20),
    );
  }
}
