import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  Handle,
  UpdatePrivacyRequest,
  UpdateProfileRequest,
} from '@narad/contracts';
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

const pageArgs = (cursor?: string, limit?: string) => ({
  cursor: cursor ?? null,
  limit: Number(limit ?? 20),
});

@Controller()
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly limiter: RateLimitService,
  ) {}

  /** Signed-in user id, after counting one action against the per-user limit. */
  private async actor(req: AuthedRequest): Promise<string> {
    const me = requireUserId(req);
    await this.limiter.hit(`social:user:${me}`, 200, 3600);
    return me;
  }

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

  @Patch('me/privacy')
  @UseGuards(SessionGuard)
  updatePrivacy(@Body() body: unknown, @Req() req: AuthedRequest) {
    const input = parseBody(
      UpdatePrivacyRequest,
      body,
      'Invalid privacy data.',
    );
    return this.social.updatePrivacy(requireUserId(req), input.isPrivate);
  }

  @Post('users/:handle/follow')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  async follow(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    const status = await this.social.follow(
      await this.actor(req),
      handleParam(handle),
    );
    return { status };
  }

  @Delete('users/:handle/follow')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async unfollow(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    await this.social.unfollow(await this.actor(req), handleParam(handle));
  }

  @Get('users/:handle/followers')
  @UseGuards(OptionalSessionGuard)
  followers(
    @Param('handle') handle: string,
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.social.listFollowers(
      handleParam(handle),
      req.auth?.user.id ?? null,
      p.cursor,
      p.limit,
    );
  }

  @Get('users/:handle/following')
  @UseGuards(OptionalSessionGuard)
  following(
    @Param('handle') handle: string,
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.social.listFollowing(
      handleParam(handle),
      req.auth?.user.id ?? null,
      p.cursor,
      p.limit,
    );
  }

  @Get('me/follow-requests')
  @UseGuards(SessionGuard)
  requests(
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.social.listRequests(requireUserId(req), p.cursor, p.limit);
  }

  @Post('me/follow-requests/:handle/approve')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async approve(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    await this.social.approve(await this.actor(req), handleParam(handle));
  }

  @Delete('me/follow-requests/:handle')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async decline(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    await this.social.decline(await this.actor(req), handleParam(handle));
  }

  @Put('users/:handle/block')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async block(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    await this.social.block(await this.actor(req), handleParam(handle));
  }

  @Delete('users/:handle/block')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async unblock(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    await this.social.unblock(await this.actor(req), handleParam(handle));
  }

  @Put('users/:handle/mute')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async mute(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    await this.social.mute(await this.actor(req), handleParam(handle));
  }

  @Delete('users/:handle/mute')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async unmute(@Param('handle') handle: string, @Req() req: AuthedRequest) {
    await this.social.unmute(await this.actor(req), handleParam(handle));
  }

  @Get('me/blocks')
  @UseGuards(SessionGuard)
  blocks(
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.social.listBlocks(requireUserId(req), p.cursor, p.limit);
  }

  @Get('me/mutes')
  @UseGuards(SessionGuard)
  mutes(
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.social.listMutes(requireUserId(req), p.cursor, p.limit);
  }
}
