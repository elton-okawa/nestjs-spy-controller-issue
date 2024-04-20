import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, INestMicroservice, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  ClientKafka,
  ClientsModule,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { TOPIC } from 'src/app.controller';
import { lastValueFrom } from 'rxjs';
import { sleep } from './helpers';
import { NestFactory } from '@nestjs/core';

const SECONDS = 1000;
jest.setTimeout(300 * SECONDS);

const PORT = 9093;

describe('AppController (e2e)', () => {
  const KAFKA_CLIENT_KEY = 'test-client';
  let app: INestMicroservice;
  let kafkaContainer: StartedKafkaContainer;
  let producer: ClientKafka;

  beforeEach(async () => {
    console.log(
      'Starting TestContainer, it might take a while. You can run "npm run test:e2e:debug" to see its logs',
    );
    kafkaContainer = await new KafkaContainer().withExposedPorts(PORT).start();
    const brokerUrl = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(PORT)}`;
    console.log(`Kafka started at "${brokerUrl}"`);

    // await sleep(60000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ClientsModule.register([
          {
            name: KAFKA_CLIENT_KEY,
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
      .setLogger(new Logger())
      .compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
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

    producer = app.get<ClientKafka>(KAFKA_CLIENT_KEY);
    await producer.connect();

    await app.listen();
  });

  afterEach(async () => {
    await app.close();
    await producer.close();
    await kafkaContainer.stop();
  });

  it('should spy controller handler', async () => {
    await lastValueFrom(
      producer.emit(TOPIC, {
        value: 'test',
      }),
    );

    await sleep(10000);
  });
});
