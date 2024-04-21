import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Partitioners } from 'kafkajs';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9095'],
        },
        consumer: {
          groupId: 'group-id',
          allowAutoTopicCreation: true,
        },
        producer: {
          createPartitioner: Partitioners.DefaultPartitioner,
        },
      },
    },
  );
  await app.listen();
}
bootstrap();
