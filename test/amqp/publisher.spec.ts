import { beforeAll, afterAll, expect } from '@jest/globals';
import amqp from 'amqplib';
import Debug from 'debug';

import { PubSubAMQPConfig } from '../../src/amqp/interfaces';
import { AMQPPublisher } from '../../src/amqp/publisher';

describe('AMQP Publisher', () => {
  const logger = Debug('AMQPPubSub');
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
      }
    };
  });

  afterAll(async () => {
    return config.connection.close();
  });

  it('should create new instance of AMQPPublisher class with connection only', () => {
    const simplePublisher = new AMQPPublisher({ connection: config.connection }, logger);

    expect(simplePublisher).not.toBeNull();
    expect(simplePublisher).not.toBeUndefined();
  });

  it('should create new instance of AMQPPublisher class with config', () => {
    publisher = new AMQPPublisher(config, logger);

    expect(publisher).not.toBeNull();
    expect(publisher).not.toBeUndefined();
  });

  // eslint-disable-next-line jest/expect-expect
  it('should publish a message to an exchange', async () => {
    return publisher.publish('test.test', { test: 'data' });
  });

  // eslint-disable-next-line jest/expect-expect
  it('should publish a second message to an exchange', async () => {
    return publisher.publish('test.test', { test: 'data' });
  });

  // eslint-disable-next-line jest/expect-expect
  it('should publish a message to an exchange with options', async () => {
    return publisher.publish('test.test', { test: 'data' }, {
      contentType: 'file',
      headers: { key: 'value' }
    });
  });
});
