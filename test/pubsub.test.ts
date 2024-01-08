import 'mocha';
import amqp from 'amqplib';
import { EventEmitter } from 'events';
import { expect } from 'chai';

import { AMQPPubSub } from '../src';
import { PubSubAMQPConfig } from '../src/amqp/interfaces';

type TestData = { test: string };
type TestDataDetail = {
  content: {
    test: string
  },
  message: amqp.ConsumeMessage
};

let pubsub: AMQPPubSub;
let config: PubSubAMQPConfig;

describe('AMQP PubSub', () => {
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

  beforeEach(() => {
    pubsub = new AMQPPubSub(config);
  });

  after(async () => {
    return config.connection.close();
  });

  it('should create new instance of AMQPPubSub class with connection only', () => {
    const simpleAMQPPubSub = new AMQPPubSub({ connection: config.connection });
    expect(simpleAMQPPubSub).to.exist;
  });

  it('should create new instance of AMQPPubSub class', () => {
    expect(pubsub).to.exist;
  });

  it('should be able to receive a message with the appropriate routingKey', async () => {
    const emitter = new EventEmitter();
    const msgPromise = new Promise<TestData>((resolve) => { emitter.once('message', resolve); });

    const subscriberId = await pubsub.subscribe('testx.*', (message) => {
      emitter.emit('message', message);
    });
    expect(subscriberId).to.exist;
    expect(isNaN(subscriberId)).to.equal(false);

    await pubsub.publish('testx.test', {test: 'data'});
    const msg = await msgPromise;

    expect(msg).to.exist;
    expect(msg.test).to.equal('data');
  });

  it('should be able to receive a raw message with the appropriate routingKey', async () => {
    const emitter = new EventEmitter();
    const msgPromise = new Promise<TestDataDetail>((resolve) => { emitter.once('message', resolve); });

    const subscriberId = await pubsub.subscribe('testheader.*', (content, message) => {
      emitter.emit('message', { content, message });
    });
    expect(subscriberId).to.exist;
    expect(isNaN(subscriberId)).to.equal(false);

    await pubsub.publish('testheader.test', {test: 'data'}, { contentType: 'file', headers: { key: 'value' }});
    const { content: msg, message: rawMsg } = await msgPromise;

    expect(msg).to.exist;
    expect(msg.test).to.equal('data');
    expect(rawMsg).to.exist;
    expect(rawMsg.properties).to.exist;
    expect(rawMsg.properties.contentType).to.exist;
    expect(rawMsg.properties.contentType).to.equal('file');
    expect(rawMsg.properties.headers).to.exist;
    expect(rawMsg.properties.headers.key).to.exist;
    expect(rawMsg.properties.headers.key).to.equal('value');
  });

  it('should be able to unsubscribe', async () => {
    const emitter = new EventEmitter();
    const errPromise = new Promise<TestData>((_resolve, reject) => { emitter.once('error', reject); });

    const subscriberId = await pubsub.subscribe('test.test', () => {
      emitter.emit('error', new Error('Should not reach'));
    });

    expect(subscriberId).to.exist;
    expect(isNaN(subscriberId)).to.equal(false);

    return Promise.race([
      pubsub.unsubscribe(subscriberId),
      errPromise
    ]);
  });

  it('should be able to receive a message after one of two subscribers unsubscribed', async () => {
    const emitter = new EventEmitter();
    const errPromise = new Promise<TestData>((_resolve, reject) => { emitter.once('error', reject); });
    const msgPromise = new Promise<TestData>((resolve) => { emitter.once('message', resolve); });

    // Subscribe two
    const id1 = await pubsub.subscribe('testy.test', () => {
      emitter.emit('error', new Error('Should not reach'));
    });
    expect(id1).to.exist;

    const id2 = await pubsub.subscribe('testy.test', (message) => {
      emitter.emit('message', message);
    });

    expect(id2).to.exist;
    expect(id1).to.not.equal(id2);

    // Unsubscribe one
    await pubsub.unsubscribe(id1);

    await pubsub.publish('testy.test', {test: '1335'});
    const msg = await Promise.race<TestData>([
      msgPromise,
      errPromise
    ]);

    // Receive message
    expect(msg).to.exist;
    expect(msg.test).to.equal('1335');
  });

  it('should be able to receive a message after one of two subscribers unsubscribed (concurrent)', async () => {
    const emitter = new EventEmitter();
    const errPromise = new Promise<TestData>((_resolve, reject) => { emitter.once('error', reject); });
    const msgPromise = new Promise<TestData>((resolve) => { emitter.once('message', resolve); });

    // Subscribe two
    const [id1, id2] = await Promise.all([
      pubsub.subscribe('testz.test', () => {
        emitter.emit('error', new Error('Should not reach'));
      }),
      pubsub.subscribe('testz.test', (message) => {
        emitter.emit('message', message);
      })
    ]);

    expect(id1).to.exist;
    expect(id2).to.exist;
    expect(id1).to.not.equal(id2);

    // Unsubscribe one
    await pubsub.unsubscribe(id1);

    await pubsub.publish('testz.test', {test: '1336'});
    const msg = await Promise.race<TestData>([
      msgPromise,
      errPromise
    ]);

    // Receive message
    expect(msg).to.exist;
    expect(msg.test).to.equal('1336');
  });

  it('should be able to receive a message after an unsubscribe and then an immediate subscribe', async () => {
    const emitter = new EventEmitter();
    const errPromise = new Promise<TestData>((_resolve, reject) => { emitter.once('error', reject); });

    // Subscribe one
    const id1 = await pubsub.subscribe('testy.test', () => {
      emitter.emit('error', new Error('Should not reach'));
    });
    expect(id1).to.exist;

    const msgPromise = new Promise<TestData>((resolve) => { emitter.once('message', resolve); });

    // Unsub one, sub while unsub is running
    const [, id2] = await Promise.all([
      pubsub.unsubscribe(id1),
      pubsub.subscribe('testy.test', (message) => {
        emitter.emit('message', message);
      })
    ]);

    expect(id2).to.exist;
    expect(id1).to.not.equal(id2);

    await pubsub.publish('testy.test', {test: '1337'});
    const msg = await Promise.race<TestData>([
      msgPromise,
      errPromise
    ]);

    // Receive message
    expect(msg).to.exist;
    expect(msg.test).to.equal('1337');
  });
});
