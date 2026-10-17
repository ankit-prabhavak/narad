import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AuthModule } from './auth/auth.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { env } from './config/env';
import { CsrfModule } from './csrf/csrf.module';
import { HealthController } from './health/health.controller';
import { ReadinessController } from './health/readiness.controller';
import { PostsModule } from './posts/posts.module';
import { RedisModule } from './redis/redis.module';
import { SocialModule } from './social/social.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req, res) => {
          const id = (req.headers['x-request-id'] as string) || randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty' },
      },
    }),
    MongooseModule.forRoot(env.MONGO_URI),
    RedisModule,
    CsrfModule,
    AuthModule,
    SocialModule,
    PostsModule,
  ],
  controllers: [HealthController, ReadinessController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
