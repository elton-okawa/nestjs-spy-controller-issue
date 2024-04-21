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
  setupTest,
} from './helpers';
import { NestFactory } from '@nestjs/core';
import { AppService } from 'src/app.service';
import { StartedTestContainer } from 'testcontainers';

const SECONDS = 1000;
jest.setTimeout(300 * SECONDS);

describe('AppController (e2e)', () => {
  let app: INestMicroservice;
  let kafkaContainer: StartedTestContainer;
  let producer: ClientKafka;

  afterEach(async () => {
    await app.close();
    await producer.close();
    await kafkaContainer.stop();
  });

  it('should spy service instance', async () => {
    ({ app, producer, kafkaContainer } = await setupTest());
    const handlerSpy = jest.spyOn(app.get<AppService>(AppService), 'handle');

    await produceEventAndWait(producer);

    expect(handlerSpy).toHaveBeenCalledTimes(1);
  });
});
