/* tslint:disable:no-unused-expression */
import { AMQPPubSub } from './pubsub';
import { expect } from 'chai';
import 'mocha';
import amqp from 'amqplib';

let conn: amqp.Connection;
let pubsub: AMQPPubSub;

describe('AMQP PubSub', () => {

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

  it('should create new instance of AMQPPubSub class', () => {
    pubsub = new AMQPPubSub({ connection: conn });
    expect(pubsub).to.exist;
  });

  it('should be able to receive a message with the appropriate routingKey', (done) => {
    pubsub.subscribe('testx.*', (message) => {
      expect(message).to.exist;
      expect(message.test).to.equal('data');
      done();
    })
    .then(subscriberId => {
      expect(subscriberId).to.exist;
      pubsub.publish('testx.test', {test: 'data'})
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
    pubsub.subscribe('test.test', () => {
      done(new Error('Should not reach'));
    })
    .then(subscriberId => {
      expect(subscriberId).to.exist;
      expect(isNaN(subscriberId)).to.equal(false);
      pubsub.unsubscribe(subscriberId)
      .then(() => {
        done();
      })
      .catch(err => {
        expect(err).to.not.exist;
      });
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    });
  });

  it('should be able to receive a message after one of two subscribers unsubscribed', (done) => {
    // Subscribe two
    pubsub.subscribe('testy.test', () => {
      done(new Error('Should not reach'));
    })
    .then(id1 => {
      pubsub.subscribe('testy.test', (message) => {
        // Receive message
        expect(message).to.exist;
        expect(message.test).to.equal('data');
        done();
      })
      .then(id2 => {
        expect(id1).to.exist;
        expect(id2).to.exist;
        expect(id1).to.not.equal(id2);
        // Unsubscribe one
        pubsub.unsubscribe(id1)
        .then(() => {
          pubsub.publish('testy.test', {test: 'data'})
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
        });
      })
      .catch(err => {
        expect(err).to.not.exist;
      });
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    });
  });

  it('should be able to receive a message after one of two subscribers unsubscribed (concurrent)', (done) => {
    // Subscribe two
    Promise.all([
      pubsub.subscribe('testz.test', () => {
        done(new Error('Should not reach'));
      }),
      pubsub.subscribe('testz.test', (message) => {
        // Receive message
        expect(message).to.exist;
        expect(message.test).to.equal('data');
        done();
      })
    ])
    .then(([id1, id2]) => {
      expect(id1).to.exist;
      expect(id2).to.exist;
      expect(id1).to.not.equal(id2);
      // Unsubscribe one
      pubsub.unsubscribe(id1)
      .then(() => {
        pubsub.publish('testz.test', {test: 'data'})
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
      });
    })
    .catch(err => {
      expect(err).to.not.exist;
      done();
    });
  });

});
