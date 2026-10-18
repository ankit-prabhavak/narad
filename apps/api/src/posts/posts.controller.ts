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
import { CreatePostRequest, EditPostRequest, Handle } from '@narad/contracts';
import { OptionalSessionGuard } from '../auth/optional-session.guard';
import { type AuthedRequest, SessionGuard } from '../auth/session.guard';
import { parseBody } from '../common/parse-body';
import { RateLimitService } from '../redis/rate-limit.service';
import { PostsService } from './posts.service';

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
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly limiter: RateLimitService,
  ) {}

  private async actor(req: AuthedRequest): Promise<string> {
    const me = requireUserId(req);
    await this.limiter.hit(`posts:user:${me}`, 300, 3600);
    return me;
  }

  @Post('posts')
  @UseGuards(SessionGuard)
  @HttpCode(201)
  async create(@Body() body: unknown, @Req() req: AuthedRequest) {
    const me = await this.actor(req);
    return this.posts.create(
      me,
      parseBody(CreatePostRequest, body, 'Invalid post.'),
    );
  }

  @Get('posts/:id')
  @UseGuards(OptionalSessionGuard)
  get(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.posts.get(id, req.auth?.user.id ?? null);
  }

  @Patch('posts/:id')
  @UseGuards(SessionGuard)
  async edit(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ) {
    const me = await this.actor(req);
    const input = parseBody(EditPostRequest, body, 'Invalid post.');
    return this.posts.edit(me, id, input.text);
  }

  @Delete('posts/:id')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.posts.remove(await this.actor(req), id);
  }

  @Post('posts/:id/replies')
  @UseGuards(SessionGuard)
  @HttpCode(201)
  async reply(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ) {
    const me = await this.actor(req);
    return this.posts.reply(
      me,
      id,
      parseBody(CreatePostRequest, body, 'Invalid comment.'),
    );
  }

  @Get('posts/:id/replies')
  @UseGuards(OptionalSessionGuard)
  replies(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.posts.replies(id, req.auth?.user.id ?? null, p.cursor, p.limit);
  }

  @Put('posts/:id/like')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async like(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.posts.setLike(await this.actor(req), id, true);
  }

  @Delete('posts/:id/like')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async unlike(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.posts.setLike(await this.actor(req), id, false);
  }

  @Put('posts/:id/bookmark')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async bookmark(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.posts.setBookmark(await this.actor(req), id, true);
  }

  @Delete('posts/:id/bookmark')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async unbookmark(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.posts.setBookmark(await this.actor(req), id, false);
  }

  @Get('me/bookmarks')
  @UseGuards(SessionGuard)
  bookmarks(
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.posts.bookmarks(requireUserId(req), p.cursor, p.limit);
  }

  @Get('users/:handle/posts')
  @UseGuards(OptionalSessionGuard)
  timeline(
    @Param('handle') handle: string,
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.posts.timeline(
      handleParam(handle),
      req.auth?.user.id ?? null,
      p.cursor,
      p.limit,
    );
  }

  @Get('feed/home')
  @UseGuards(SessionGuard)
  feed(
    @Req() req: AuthedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const p = pageArgs(cursor, limit);
    return this.posts.homeFeed(requireUserId(req), p.cursor, p.limit);
  }
}
