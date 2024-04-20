import { Controller, OnModuleInit } from '@nestjs/common';
import { AppService } from './app.service';
import { EventPattern, Payload } from '@nestjs/microservices';

export const TOPIC = 'example-topic';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern(TOPIC)
  handle(@Payload() payload: Record<string, unknown>) {
    this.appService.handle(payload);
  }
}
