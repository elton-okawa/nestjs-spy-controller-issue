import { INestMicroservice } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { AppController } from 'src/app.controller';
import { produceEventAndWait, setupTest } from './helpers';
import { AppService } from 'src/app.service';
import { StartedTestContainer } from 'testcontainers';

const SECONDS = 1000;
jest.setTimeout(300 * SECONDS);

describe('AppController (e2e)', () => {
  let app: INestMicroservice;
  let kafkaContainer: StartedTestContainer;
  let producer: ClientKafka;

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
    await producer.close();
    await kafkaContainer.stop();
  });

  describe('service', () => {
    it('should spy service instance', async () => {
      ({ app, producer, kafkaContainer } = await setupTest());
      const handlerSpy = jest.spyOn(app.get<AppService>(AppService), 'handle');

      await produceEventAndWait(producer, 'spy service instance');

      expect(handlerSpy).toHaveBeenCalledTimes(1);
    });

    it('should spy service prototype before init', async () => {
      const handlerSpy = jest.spyOn(AppService.prototype, 'handle');
      ({ app, producer, kafkaContainer } = await setupTest());

      await produceEventAndWait(producer, 'spy service prototype before init');

      expect(handlerSpy).toHaveBeenCalledTimes(1);
    });

    it('should spy service prototype after init', async () => {
      ({ app, producer, kafkaContainer } = await setupTest());
      const handlerSpy = jest.spyOn(AppService.prototype, 'handle');

      await produceEventAndWait(producer, 'spy service prototype after init');

      expect(handlerSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('controller', () => {
    it('should spy controller instance', async () => {
      ({ app, producer, kafkaContainer } = await setupTest());
      const handlerSpy = jest.spyOn(
        app.get<AppController>(AppController),
        'handle',
      );

      await produceEventAndWait(producer, 'spy controller instance');

      expect(handlerSpy).toHaveBeenCalledTimes(1);
    });

    it('should spy controller prototype before init', async () => {
      const handlerSpy = jest.spyOn(AppController.prototype, 'handle');
      ({ app, producer, kafkaContainer } = await setupTest());

      await produceEventAndWait(
        producer,
        'spy controller prototype before init',
      );

      expect(handlerSpy).toHaveBeenCalledTimes(1);
    });

    it('should spy controller prototype after init', async () => {
      ({ app, producer, kafkaContainer } = await setupTest());
      const handlerSpy = jest.spyOn(AppController.prototype, 'handle');

      await produceEventAndWait(
        producer,
        'spy controller prototype after init',
      );

      expect(handlerSpy).toHaveBeenCalledTimes(1);
    });
  });
});
