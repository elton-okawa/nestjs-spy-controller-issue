import { Kafka } from 'kafkajs';
import { TOPIC } from '../src/app.controller';

async function main() {
  const kafka = new Kafka({
    clientId: 'producer',
    brokers: ['localhost:9092'],
  });

  const producer = kafka.producer();
  await producer.connect();

  await producer.send({
    topic: TOPIC,
    messages: [{ value: 'Hello World!' }],
  });

  await producer.disconnect();
  console.log('Message produced successfully!');
}

main();
