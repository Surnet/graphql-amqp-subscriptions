import { AMQPPublisher } from './publisher';
import { expect } from 'chai';
import 'mocha';
import Debug from 'debug';
import amqp from 'amqplib';

const logger = Debug('AMQPPubSub');

let conn: amqp.Connection;
let publisher: AMQPPublisher;

describe('AMQP Publisher', () => {

  before((done) => {
    amqp.connect('amqp://guest:guest@localhost:5672?heartbeat=30')
    .then(amqpConn => {
      conn = amqpConn;
      done();
    })
    .catch(err => {
      done(err);
    });
  });

  after((done) => {
    conn.close()
    .then(() => {
      done();
    })
    .catch(err => {
      done(err);
    });
  });

  it('should create new instance of AMQPPublisher class', () => {
    publisher = new AMQPPublisher(conn, logger);
    expect(publisher).to.exist;
  });

  it('should publish a message to an exchange', (done) => {
    publisher.publish('exchange', 'test.test', {test: 'data'})
    .then(() => {
      done();
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    })
  });

  it('should publish a second message to an exchange', (done) => {
    publisher.publish('exchange', 'test.test', {test: 'data'})
    .then(() => {
      done();
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    })
  });

});
