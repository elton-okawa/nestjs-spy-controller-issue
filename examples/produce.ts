import { Kafka, Partitioners } from 'kafkajs';
import { TOPIC } from '../src/app.controller';

async function main() {
  const kafka = new Kafka({
    clientId: 'producer',
    brokers: ['localhost:9095'],
  });

  const producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
  });
  await producer.connect();

  await producer.send({
    topic: TOPIC,
    messages: [{ value: 'Hello World!' }],
  });

  await producer.disconnect();
  console.log('Message produced successfully!');
}

main();
