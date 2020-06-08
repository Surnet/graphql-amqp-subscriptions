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
      },
      queue: {}
    };
  });

  after(async () => {
    return config.connection.close();
  });

  it('should create new instance of AMQPPublisher class', () => {
    publisher = new AMQPPublisher(config, logger);
    expect(publisher).to.exist;
  });

  it('should publish a message to an exchange', async () => {
    return publisher.publish('test.test', {test: 'data'});
  });

  it('should publish a second message to an exchange', async () => {
    return publisher.publish('test.test', {test: 'data'});
  });

});
