/* tslint:disable:no-unused-expression */
import { AMQPSubscriber } from './subscriber';
import { AMQPPublisher } from './publisher';
import { expect } from 'chai';
import 'mocha';
import Debug from 'debug';
import amqp from 'amqplib';

const logger = Debug('AMQPPubSub');

let conn: amqp.Connection;
let subscriber: AMQPSubscriber;
let publisher: AMQPPublisher;

describe('AMQP Subscriber', () => {

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

  it('should create new instance of AMQPSubscriber class', () => {
    subscriber = new AMQPSubscriber(conn, logger);
    expect(subscriber).to.exist;
  });

  it('should create new instance of AMQPPublisher class', () => {
    publisher = new AMQPPublisher(conn, logger);
    expect(publisher).to.exist;
  });

  it('should be able to receive a message through an exchange', (done) => {
    subscriber.subscribe('exchange', '*.test', (routingKey, message) => {
      expect(routingKey).to.exist;
      expect(message).to.exist;
      expect(message.test).to.exist;
      expect(message.test).to.equal('data');
      done();
    })
    .then(disposer => {
      expect(disposer).to.exist;
      publisher.publish('exchange', 'test.test', {test: 'data'})
      .then(() => {
        expect(true).to.equal(true);
      })
      .catch(err => {
        expect(err).to.not.exist;
        done();
      });
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    });
  });

  it('should be able to unsubscribe', (done) => {
    subscriber.subscribe('exchange', 'test.test', () => {
      done(new Error('Should not reach'));
    })
    .then(disposer => {
      expect(disposer).to.exist;
      disposer()
      .then(() => {
        done();
      });
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    });
  });

});
