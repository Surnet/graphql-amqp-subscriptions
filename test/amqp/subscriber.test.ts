import Debug from 'debug';
import amqp from 'amqplib';
import { EventEmitter } from 'events';
import { beforeAll, afterAll, expect } from '@jest/globals';

import { AMQPSubscriber } from '../../src/amqp/subscriber';
import { AMQPPublisher } from '../../src/amqp/publisher';
import { PubSubAMQPConfig } from '../../src/amqp/interfaces';
import { Common } from '../../src/amqp/common';

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

    expect(simpleSubscriber).not.toBeNull();
    expect(simpleSubscriber).not.toBeUndefined();
  });

  it('should create new instance of AMQPSubscriber class with config', () => {
    subscriber = new AMQPSubscriber(config, logger);

    expect(subscriber).not.toBeNull();
    expect(subscriber).not.toBeUndefined();
  });

  it('should create new instance of AMQPPublisher class', () => {
    publisher = new AMQPPublisher(config, logger);

    expect(publisher).not.toBeNull();
    expect(publisher).not.toBeUndefined();
  });

  it('should be able to receive a message through an exchange', async () => {
    const emitter = new EventEmitter();
    const msgPromise = new Promise<TestData>((resolve) => { emitter.once('message', resolve); });

    const dispose = await subscriber.subscribe('*.test', (routingKey, content) => {
      emitter.emit('message', { routingKey, content });
    });

    expect(dispose).not.toBeNull();
    expect(dispose).not.toBeUndefined();

    await publisher.publish('test.test', {test: 'data'});
    const { routingKey: key, content: msg } = await msgPromise;

    expect(key).not.toBeNull();
    expect(key).not.toBeUndefined();
    expect(msg).not.toBeNull();
    expect(msg).not.toBeUndefined();
    expect(msg.test).not.toBeNull();
    expect(msg.test).not.toBeUndefined();
    expect(msg.test).toEqual('data');

    return dispose();
  });

  it('should be able to receive a message through an exchange with header information', async () => {
    const emitter = new EventEmitter();
    const msgPromise = new Promise<TestData>((resolve) => { emitter.once('message', resolve); });

    const dispose = await subscriber.subscribe('*.test', (routingKey, content, message) => {
      emitter.emit('message', { routingKey, content, message });
    });
    expect(dispose).not.toBeNull();
    expect(dispose).not.toBeUndefined();

    await publisher.publish('test.test', {test: 'data'}, { contentType: 'file', headers: { key: 'value' }});
    const { routingKey: key, content: msg, message: rawMsg } = await msgPromise;

    expect(key).not.toBeNull();
    expect(key).not.toBeUndefined();
    expect(msg).not.toBeNull();
    expect(msg).not.toBeUndefined();
    expect(msg.test).not.toBeNull();
    expect(msg.test).not.toBeUndefined();
    expect(msg.test).toEqual('data');
    expect(rawMsg).not.toBeNull();
    expect(rawMsg).not.toBeUndefined();

    const converted = Common.convertMessage(rawMsg);
    expect(converted).not.toBeNull();
    expect(converted).not.toBeUndefined();
    expect(converted.test).not.toBeNull();
    expect(converted.test).not.toBeUndefined();
    expect(converted.test).toEqual('data');
    expect(rawMsg.properties).not.toBeNull();
    expect(rawMsg.properties).not.toBeUndefined();
    expect(rawMsg.properties.contentType).not.toBeNull();
    expect(rawMsg.properties.contentType).not.toBeUndefined();
    expect(rawMsg.properties.contentType).toEqual('file');
    expect(rawMsg.properties.headers).not.toBeNull();
    expect(rawMsg.properties.headers).not.toBeUndefined();
    expect(rawMsg.properties.headers.key).not.toBeNull();
    expect(rawMsg.properties.headers.key).not.toBeUndefined();
    expect(rawMsg.properties.headers.key).toEqual('value');

    return dispose();
  });

  it('should be able to unsubscribe', async () => {
    const emitter = new EventEmitter();
    const errPromise = new Promise((_resolve, reject) => { emitter.once('error', reject); });

    const dispose = await subscriber.subscribe('test.test', () => {
      emitter.emit('error', new Error('Should not reach'));
    });

    return Promise.race([
      dispose,
      errPromise
    ]);
  });
});
