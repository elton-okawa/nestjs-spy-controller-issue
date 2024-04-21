# NestJS spy controller issue

**Motivation**: I want to ensure on my E2E tests that I'm not retrying events that are not supposed to be retried, such as malformed events and events with business errors. The best place to ensure it is by spying the `Controller`'s method annotated by `EventPattern`.

**Results**:

1. :x: `spy controller instance` - event is handled but spy does not track method call
2. :x: `spy controller prototype before init` - event is not handled and as consequence test fails
3. :x: `spy controller prototype after init` - event is handled but spy does not track method call

From a similar issue [nestjs#8790](https://github.com/nestjs/nest/issues/8790) it [states](https://github.com/nestjs/nest/issues/8790#issuecomment-994480901) that:

> Long story short: you can spy on/mock service methods. You can't spy on/mock controller methods (annotated methods) after your app is initialized (execution context is created).

From this statement, I concluded that spying on controller's annotated method has some dependency over execution context, so spying on its `prototype` should work, but in practice it's not.

## About this setup

It runs e2e tests by spinning up Kafka using TestContainers, starting NestJS application, publishing events, waiting for handling and then making assertions.

## Quick start testing

Install dependencies and run e2e tests:

```
npm install
npm run test:e2e
```

## Running each test individually

```
npm run test:e2e -- -t 'should spy controller instance'
```

```
npm run test:e2e -- -t 'should spy controller prototype before init'
```

```
npm run test:e2e -- -t 'should spy controller prototype after init'
```

## Running application locally

Starting Kafka and application:

```
docker compose up -d
npm start:dev
```

Producing messages:

```
npm run produce
```

You can also visit KafkaUI at: http://localhost:8080
