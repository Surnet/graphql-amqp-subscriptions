/* tslint:disable:no-unused-expression */
import { AMQPPublisher } from './publisher';
import { PubSubAMQPConfig } from './interfaces';
import { expect } from 'chai';
import 'mocha';
import Debug from 'debug';
import amqp from 'amqplib';

const logger = Debug('AMQPPubSub');

let config: PubSubAMQPConfig;
let publisher: AMQPPublisher;

describe('AMQP Publisher', () => {

  before((done) => {
    amqp.connect('amqp://guest:guest@localhost:5672?heartbeat=30')
    .then(amqpConn => {
      config = {
        connection: amqpConn,
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
      done();
    })
    .catch(err => {
      done(err);
    });
  });

  after((done) => {
    config.connection.close()
    .then(() => {
      done();
    })
    .catch(err => {
      done(err);
    });
  });

  it('should create new instance of AMQPPublisher class', () => {
    publisher = new AMQPPublisher(config, logger);
    expect(publisher).to.exist;
  });

  it('should publish a message to an exchange', (done) => {
    publisher.publish('test.test', {test: 'data'})
    .then(() => {
      done();
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    });
  });

  it('should publish a second message to an exchange', (done) => {
    publisher.publish('test.test', {test: 'data'})
    .then(() => {
      done();
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    });
  });

});
