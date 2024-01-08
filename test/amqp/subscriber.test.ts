import { expect } from 'chai';
import 'mocha';
import Debug from 'debug';
import amqp from 'amqplib';
import { EventEmitter } from 'events';

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

const logger = Debug('AMQPPubSub');

let subscriber: AMQPSubscriber;
let publisher: AMQPPublisher;
let config: PubSubAMQPConfig;

describe('AMQP Subscriber', () => {
  before(async () => {
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

  after(async () => {
    return config.connection.close();
  });

  it('should create new instance of AMQPSubscriber class with connection only', () => {
    const simpleSubscriber = new AMQPSubscriber({ connection: config.connection }, logger);
    expect(simpleSubscriber).to.exist;
  });

  it('should create new instance of AMQPSubscriber class with config', () => {
    subscriber = new AMQPSubscriber(config, logger);
    expect(subscriber).to.exist;
  });

  it('should create new instance of AMQPPublisher class', () => {
    publisher = new AMQPPublisher(config, logger);
    expect(publisher).to.exist;
  });

  it('should be able to receive a message through an exchange', async () => {
    const emitter = new EventEmitter();
    const msgPromise = new Promise<TestData>((resolve) => { emitter.once('message', resolve); });

    const dispose = await subscriber.subscribe('*.test', (routingKey, content) => {
      emitter.emit('message', { routingKey, content });
    });
    expect(dispose).to.exist;

    await publisher.publish('test.test', {test: 'data'});
    const { routingKey: key, content: msg } = await msgPromise;

    expect(key).to.exist;
    expect(msg).to.exist;
    expect(msg.test).to.exist;
    expect(msg.test).to.equal('data');

    return dispose();
  });

  it('should be able to receive a message through an exchange with header information', async () => {
    const emitter = new EventEmitter();
    const msgPromise = new Promise<TestData>((resolve) => { emitter.once('message', resolve); });

    const dispose = await subscriber.subscribe('*.test', (routingKey, content, message) => {
      emitter.emit('message', { routingKey, content, message });
    });
    expect(dispose).to.exist;

    await publisher.publish('test.test', {test: 'data'}, { contentType: 'file', headers: { key: 'value' }});
    const { routingKey: key, content: msg, message: rawMsg } = await msgPromise;

    expect(key).to.exist;
    expect(msg).to.exist;
    expect(msg.test).to.exist;
    expect(msg.test).to.equal('data');
    expect(rawMsg).to.exist;
    const converted = Common.convertMessage(rawMsg);
    expect(converted).to.exist;
    expect(converted.test).to.exist;
    expect(converted.test).to.equal('data');
    expect(rawMsg.properties).to.exist;
    expect(rawMsg.properties.contentType).to.exist;
    expect(rawMsg.properties.contentType).to.equal('file');
    expect(rawMsg.properties.headers).to.exist;
    expect(rawMsg.properties.headers.key).to.exist;
    expect(rawMsg.properties.headers.key).to.equal('value');

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
