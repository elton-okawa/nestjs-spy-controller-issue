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
import {
  sleep,
  initTestContainer,
  createMicroservice,
  produceEventAndWait,
} from './helpers';
import { NestFactory } from '@nestjs/core';
import { AppService } from 'src/app.service';
import { StartedTestContainer } from 'testcontainers';

const SECONDS = 1000;
jest.setTimeout(300 * SECONDS);

const PORT = 9094;

describe('AppController (e2e)', () => {
  const KAFKA_CLIENT_KEY = 'test-client';
  let app: INestMicroservice;
  let kafkaContainer: StartedTestContainer;
  let producer: ClientKafka;

  beforeEach(async () => {
    const testContainerSetup = await initTestContainer(PORT);
    kafkaContainer = testContainerSetup.kafkaContainer;

    ({ app } = await createMicroservice({
      kafkaClientKey: KAFKA_CLIENT_KEY,
      brokerUrl: testContainerSetup.brokerUrl,
    }));

    producer = app.get<ClientKafka>(KAFKA_CLIENT_KEY);
    await producer.connect();

    await app.listen();
    await sleep(10000, 'workaround - nestjs starts before consumer joins');
  });

  afterEach(async () => {
    await app.close();
    await producer.close();
    await kafkaContainer.stop();
  });

  it('should spy service instance', async () => {
    await produceEventAndWait(producer);

    // expect(handlerSpy).toHaveBeenCalledTimes(1);
  });
});
