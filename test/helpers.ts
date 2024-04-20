import { Logger } from '@nestjs/common';
import {
  ClientsModule,
  Transport,
  MicroserviceOptions,
  ClientKafka,
} from '@nestjs/microservices';
import { TestingModule, Test } from '@nestjs/testing';
import { KafkaContainer } from '@testcontainers/kafka';
import { lastValueFrom } from 'rxjs';
import { TOPIC } from 'src/app.controller';
import { AppModule } from 'src/app.module';
import { Wait } from 'testcontainers';

const logger = new Logger('E2E Test');

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function initTestContainer(port: number) {
  logger.log(
    'Starting TestContainer, it might take a while. You can run "npm run test:e2e:debug" to see its logs',
  );
  const kafkaContainer = await new KafkaContainer()
    .withExposedPorts(port)
    .start();
  await sleep(20000); // wait for leader election
  const brokerUrl = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(port)}`;
  logger.log(`Kafka started at "${brokerUrl}"`);

  return { kafkaContainer, brokerUrl };
}

export type InitMicroserviceParams = {
  kafkaClientKey: string;
  brokerUrl: string;
};

export async function createMicroservice({
  kafkaClientKey,
  brokerUrl,
}: InitMicroserviceParams) {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      AppModule,
      ClientsModule.register([
        {
          name: kafkaClientKey,
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'test-producer',
              brokers: [brokerUrl],
            },
            producer: {
              allowAutoTopicCreation: true,
            },
            producerOnlyMode: true,
          },
        },
      ]),
    ],
  })
    .setLogger(logger)
    .compile();

  const app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'test-consumer',
        brokers: [brokerUrl],
      },
      consumer: {
        groupId: 'test-group-id',
        allowAutoTopicCreation: true,
      },
    },
  });

  return { app };
}

export async function produceEventAndWait(producer: ClientKafka) {
  logger.log('Producing message...');
  await lastValueFrom(
    producer.emit(TOPIC, {
      value: 'test',
    }),
  );
  logger.log('Message produced successfully!');

  logger.log('Waiting message to be consumed...');
  await sleep(10000);
  logger.log('Message should be consumed at this point');
}
