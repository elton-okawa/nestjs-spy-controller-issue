import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  handle(message: Record<string, unknown>) {
    this.logger.log(`Message received: "${message}"`);
  }
}
