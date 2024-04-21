import { Logger } from '@nestjs/common';
import {
  ClientsModule,
  Transport,
  MicroserviceOptions,
  ClientKafka,
} from '@nestjs/microservices';
import { TestingModule, Test } from '@nestjs/testing';
import { Partitioners } from 'kafkajs';
import { lastValueFrom } from 'rxjs';
import { TOPIC } from 'src/app.controller';
import { AppModule } from 'src/app.module';
import { GenericContainer, Wait } from 'testcontainers';

const PORT = 9094;
const KAFKA_CLIENT_KEY = 'test-client';
const logger = new Logger('E2E Test');

export async function sleep(ms: number, reason: string) {
  logger.debug(`Waiting "${reason}" for ${ms}ms...`);
  await new Promise((resolve) => setTimeout(resolve, ms));
  logger.debug(`Finished waiting for "${reason}"`);
}

export async function setupTest() {
  const testContainerSetup = await initTestContainer(PORT);
  const kafkaContainer = testContainerSetup.kafkaContainer;

  const { app, producer } = await createMicroservice({
    kafkaClientKey: KAFKA_CLIENT_KEY,
    brokerUrl: testContainerSetup.brokerUrl,
  });

  return { kafkaContainer, app, producer };
}

export async function initTestContainer(port: number) {
  logger.debug(
    'Starting TestContainer, it might take a while. You can run "npm run test:e2e:debug" to see its logs',
  );
  const kafkaContainer = await new GenericContainer('bitnami/kafka:3.6.2')
    .withEnvironment({
      KAFKA_CFG_NODE_ID: '0',
      KAFKA_CFG_PROCESS_ROLES: 'controller,broker',
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: '0@:9093',
      KAFKA_CFG_LISTENERS: `PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:${port}`,
      KAFKA_CFG_ADVERTISED_LISTENERS: `PLAINTEXT://kafkatest:9092,EXTERNAL://localhost:${port}`,
      KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP:
        'CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT,PLAINTEXT:PLAINTEXT',
      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: 'CONTROLLER',
    })
    .withExposedPorts({ container: port, host: port })
    .withWaitStrategy(Wait.forLogMessage('Kafka Server started'))
    .start();

  const { output, exitCode } = await kafkaContainer.exec(
    `./kafka-topics.sh  --create --if-not-exists --topic ${TOPIC} --replication-factor=1 --partitions=1 --bootstrap-server localhost:${port}`.split(
      ' ',
    ),
    { workingDir: '/opt/bitnami/kafka/bin/' },
  );
  if (exitCode !== 0) {
    throw new Error(`Failed to create topic (${exitCode}): "${output}"`);
  }
  logger.debug(`Topics created successfully!`);

  const brokerUrl = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(port)}`;
  logger.debug(`Kafka started at "${brokerUrl}"`);

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
              createPartitioner: Partitioners.DefaultPartitioner,
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
        groupId: 'test-group',
        allowAutoTopicCreation: true,
      },
      producer: {
        createPartitioner: Partitioners.DefaultPartitioner,
      },
    },
  });

  const producer = app.get<ClientKafka>(kafkaClientKey);
  await producer.connect();

  await app.listen();
  await sleep(10000, 'workaround - nestjs starts before consumer joins');

  return { app, producer };
}

export async function produceEventAndWait(
  producer: ClientKafka,
  message: string,
) {
  logger.debug('Producing message...');
  await lastValueFrom(
    producer.emit(TOPIC, {
      value: message,
    }),
  );
  logger.debug('Message produced successfully!');
  await sleep(10000, 'message to be consumed');
  logger.debug('Message should be consumed at this point');
}
