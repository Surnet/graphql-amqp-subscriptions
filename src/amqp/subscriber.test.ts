/* tslint:disable:no-unused-expression */
import { AMQPSubscriber } from './subscriber';
import { AMQPPublisher } from './publisher';
import { PubSubAMQPConfig } from './interfaces';
import { expect } from 'chai';
import 'mocha';
import Debug from 'debug';
import amqp from 'amqplib';
import { EventEmitter } from 'events';

type TestData = {
  routingKey: string,
  message: {
    test: string
  }
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
          durable: true,
          autoDelete: true
        }
      }
    };
  });

  after(async () => {
    return config.connection.close();
  });

  it('should create new instance of AMQPSubscriber class', () => {
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

    const dispose = await subscriber.subscribe('*.test', (routingKey, message) => {
      emitter.emit('message', { routingKey, message });
    });
    expect(dispose).to.exist;

    await publisher.publish('test.test', {test: 'data'});
    const { routingKey: key, message: msg } = await msgPromise;

    expect(key).to.exist;
    expect(msg).to.exist;
    expect(msg.test).to.exist;
    expect(msg.test).to.equal('data');

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
