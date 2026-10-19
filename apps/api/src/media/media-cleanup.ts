import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { env } from '../config/env';
import { MediaAssetService } from './media-asset.service';

const HOUR_MS = 60 * 60 * 1000;

/** Hourly removal of uploads that were never attached to a post. Safe to run on several instances. */
@Injectable()
export class MediaCleanup implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaCleanup.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly assets: MediaAssetService) {}

  onModuleInit(): void {
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.run();
    }, HOUR_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    try {
      const count = await this.assets.purgeAbandoned(24 * HOUR_MS);
      if (count > 0) this.logger.log(`Removed ${count} abandoned uploads`);
    } catch (err) {
      this.logger.warn(`Cleanup failed: ${String(err)}`);
    }
  }
}
