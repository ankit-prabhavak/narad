import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { env } from '../config/env';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ChallengeSchema, Challenge } from './challenge.schema';
import { ChallengeService } from './challenge.service';
import { RecoveryController } from './recovery.controller';
import { RecoveryService, WEB_ORIGIN } from './recovery.service';
import { OptionalSessionGuard } from './optional-session.guard';
import { SessionGuard } from './session.guard';
import { Session, SessionSchema } from './session.schema';
import { SessionService } from './session.service';

@Module({
  imports: [
    UsersModule,
    MailModule,
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Challenge.name, schema: ChallengeSchema },
    ]),
  ],
  controllers: [AuthController, RecoveryController],
  exports: [SessionService, SessionGuard, OptionalSessionGuard],
  providers: [
    AuthService,
    SessionService,
    SessionGuard,
    OptionalSessionGuard,
    ChallengeService,
    RecoveryService,
    { provide: WEB_ORIGIN, useFactory: () => env.WEB_ORIGIN },
  ],
})
export class AuthModule {}
