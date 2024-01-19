import { beforeAll, afterAll, expect } from '@jest/globals';
import amqp from 'amqplib';
import Debug from 'debug';
import { EventEmitter } from 'node:events';

import { Common } from '../../src/amqp/common';
import { PubSubAMQPConfig } from '../../src/amqp/interfaces';
import { AMQPPublisher } from '../../src/amqp/publisher';
import { AMQPSubscriber } from '../../src/amqp/subscriber';

type TestData = {
  routingKey: string,
  content: {
    test: string
  },
  message: amqp.ConsumeMessage
};

describe('AMQP Subscriber', () => {
  const logger = Debug('AMQPPubSub');
  let subscriber: AMQPSubscriber;
  let publisher: AMQPPublisher;
  let config: PubSubAMQPConfig;

  beforeAll(async () => {
    config = {
      connection: await amqp.connect('amqp://guest:guest@localhost:5672?heartbeat=30'),
      exchange: {
        name: 'exchange',
        type: 'topic',
        options: {
          durable: false,
          autoDelete: true
        }
      },
      queue: {
        options: {
          exclusive: true,
          durable: false,
          autoDelete: true
        }
      }
    };
  });

  afterAll(async () => {
    return config.connection.close();
  });

  it('should create new instance of AMQPSubscriber class with connection only', () => {
    const simpleSubscriber = new AMQPSubscriber({ connection: config.connection }, logger);

    expect(simpleSubscriber).toBeDefined();
  });

  it('should create new instance of AMQPSubscriber class with config', () => {
    subscriber = new AMQPSubscriber(config, logger);

    expect(subscriber).toBeDefined();
  });

  it('should create new instance of AMQPPublisher class', () => {
    publisher = new AMQPPublisher(config, logger);

    expect(publisher).toBeDefined();
  });

  it('should be able to receive a message through an exchange', async () => {
    const emitter = new EventEmitter();
    const messagePromise = new Promise<TestData>((resolve) => {
      emitter.once('message', resolve);
    });

    const dispose = await subscriber.subscribe('*.test', (routingKey, content) => {
      emitter.emit('message', { routingKey, content });
    });

    expect(dispose).toBeDefined();

    await publisher.publish('test.test', { test: 'data' });
    const { routingKey: key, content: message } = await messagePromise;

    expect(key).toBeDefined();
    expect(message).toBeDefined();
    expect(message.test).toBeDefined();
    expect(message.test).toEqual('data');

    return dispose();
  });

  it('should be able to receive a message through an exchange with header information', async () => {
    const emitter = new EventEmitter();
    const messagePromise = new Promise<TestData>((resolve) => {
      emitter.once('message', resolve);
    });

    const dispose = await subscriber.subscribe('*.test', (routingKey, content, message) => {
      emitter.emit('message', { routingKey, content, message });
    });
    expect(dispose).toBeDefined();

    await publisher.publish('test.test', { test: 'data' }, { contentType: 'file', headers: { key: 'value' } });
    const { routingKey: key, content: message, message: rawMessage } = await messagePromise;

    expect(key).toBeDefined();
    expect(message).toBeDefined();
    expect(message.test).toBeDefined();
    expect(message.test).toEqual('data');
    expect(rawMessage).toBeDefined();

    const converted = Common.convertMessage(rawMessage);
    expect(converted).toBeDefined();
    expect(converted.test).toBeDefined();
    expect(converted.test).toEqual('data');
    expect(rawMessage.properties).toBeDefined();
    expect(rawMessage.properties.contentType).toBeDefined();
    expect(rawMessage.properties.contentType).toEqual('file');
    expect(rawMessage.properties.headers).toBeDefined();
    expect(rawMessage.properties.headers.key).toBeDefined();
    expect(rawMessage.properties.headers.key).toEqual('value');

    return dispose();
  });

  // eslint-disable-next-line jest/expect-expect
  it('should be able to unsubscribe', async () => {
    const emitter = new EventEmitter();
    const errorPromise = new Promise((_resolve, reject) => {
      emitter.once('error', reject);
    });

    const dispose = await subscriber.subscribe('test.test', () => {
      emitter.emit('error', new Error('Should not reach'));
    });

    return Promise.race([
      dispose,
      errorPromise
    ]);
  });
});
