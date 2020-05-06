/* tslint:disable:no-unused-expression */
import { AMQPPublisher } from './publisher';
import { expect } from 'chai';
import 'mocha';
import Debug from 'debug';
import amqp from 'amqplib';

const logger = Debug('AMQPPubSub');

let conn: amqp.Connection;
let publisher: AMQPPublisher;

describe('AMQP Publisher', () => {

  before(async () => {
    conn = await amqp.connect('amqp://guest:guest@localhost:5672?heartbeat=30');
  });

  after(async () => {
    return conn.close();
  });

  it('should create new instance of AMQPPublisher class', () => {
    publisher = new AMQPPublisher(conn, logger);
    expect(publisher).to.exist;
  });

  it('should publish multiple messages to an exchange', async () => {
    return publisher.publish('exchange', 'test.test', {test: 'data'});
  });

  it('should publish a second message to an exchange', async () => {
    return publisher.publish('exchange', 'test.test', {test: 'data'});
  });

});
