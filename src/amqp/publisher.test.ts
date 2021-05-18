/* tslint:disable:no-unused-expression */
import { AMQPPublisher } from './publisher';
import { PubSubAMQPConfig } from './interfaces';
import { expect } from 'chai';
import 'mocha';
import Debug from 'debug';
import amqp from 'amqplib';

const logger = Debug('AMQPPubSub');

let publisher: AMQPPublisher;
let config: PubSubAMQPConfig;

describe('AMQP Publisher', () => {

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
      }
    };
  });

  after(async () => {
    return config.connection.close();
  });

  it('should create new instance of AMQPPublisher class with connection only', () => {
    const simplePublisher = new AMQPPublisher({ connection: config.connection }, logger);
    expect(simplePublisher).to.exist;
  });

  it('should create new instance of AMQPPublisher class with config', () => {
    publisher = new AMQPPublisher(config, logger);
    expect(publisher).to.exist;
  });

  it('should publish a message to an exchange', async () => {
    return publisher.publish('test.test', {test: 'data'});
  });

  it('should publish a second message to an exchange', async () => {
    return publisher.publish('test.test', {test: 'data'});
  });

  it('should publish a message to an exchange with options', async () => {
    return publisher.publish('test.test', {test: 'data'}, {
      contentType: 'file',
      headers: { key: 'value' }
    });
  });

});
