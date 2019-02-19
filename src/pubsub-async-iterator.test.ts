/* tslint:disable:no-unused-expression */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { spy } from 'sinon';
import sinonChai from 'sinon-chai';

import { isAsyncIterable } from 'iterall';
import { AMQPPubSub as PubSub } from './pubsub';
import { ExecutionResult } from 'graphql';
import amqp from 'amqplib';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const expect = chai.expect;

import {
  parse,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';

import { subscribe } from 'graphql/subscription';

const FIRST_EVENT = 'FIRST_EVENT';

let conn: amqp.Connection;

function buildSchema(iterator: any) {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        testString: {
          type: GraphQLString,
          resolve: function() {
            return 'works';
          },
        },
      },
    }),
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        testSubscription: {
          type: GraphQLString,
          subscribe: () => iterator,
          resolve: () => {
            return 'FIRST_EVENT';
          },
        },
      },
    }),
  });
}

describe('GraphQL-JS asyncIterator', () => {

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
    setTimeout(() => {
      conn.close()
      .then(() => {
        done();
      })
      .catch(err => {
        done(err);
      });
    }, 100);
  });

  it('should allow subscriptions', async () => {
    const query = parse(`
      subscription S1 {

        testSubscription
      }
    `);
    const pubsub = new PubSub({ connection: conn });
    const origIterator = pubsub.asyncIterator(FIRST_EVENT);
    const schema = buildSchema(origIterator);

    const results = await subscribe(schema, query) as AsyncIterator<ExecutionResult>;
    const payload1 = results.next();

    expect(isAsyncIterable(results)).to.be.true;

    const r = payload1.then(res => {
      expect(res.value.data!.testSubscription).to.equal('FIRST_EVENT');
    });

    setTimeout(() => {
      pubsub.publish(FIRST_EVENT, {});
    }, 100);

    return r;
  });

  it('should allow async filter', async () => {
    const query = parse(`
      subscription S1 {

        testSubscription
      }
    `);
    const pubsub = new PubSub({ connection: conn });
    const origIterator = pubsub.asyncIterator(FIRST_EVENT);
    const schema = buildSchema(origIterator);

    const results = await subscribe(schema, query) as AsyncIterator<ExecutionResult>;
    const payload1 = results.next();

    expect(isAsyncIterable(results)).to.be.true;

    const r = payload1.then(res => {
      expect(res.value.data!.testSubscription).to.equal('FIRST_EVENT');
    });

    setTimeout(() => {
      pubsub.publish(FIRST_EVENT, {});
    }, 100);

    return r;
  });

  it('should detect when the payload is done when filtering', (done) => {
    const query = parse(`
      subscription S1 {
        testSubscription
      }
    `);

    const pubsub = new PubSub({ connection: conn });
    const origIterator = pubsub.asyncIterator(FIRST_EVENT);

    const schema = buildSchema(origIterator);

    Promise.resolve(subscribe(schema, query)).then((results: AsyncIterator<ExecutionResult> | ExecutionResult) => {
      expect(isAsyncIterable(results)).to.be.true;
      results = <AsyncIterator<ExecutionResult>>results;

      results.next();
      results.return!();

      setTimeout(() => {
        pubsub.publish(FIRST_EVENT, {});
      }, 100);

      setTimeout(_ => {
        done();
      }, 500);
    });
  });

  it('should clear event handlers', async () => {
    const query = parse(`
      subscription S1 {
        testSubscription
      }
    `);

    const pubsub = new PubSub({ connection: conn });
    const origIterator = pubsub.asyncIterator(FIRST_EVENT);
    const returnSpy = spy(origIterator, 'return');
    const schema = buildSchema(origIterator);

    const results = await subscribe(schema, query) as AsyncIterator<ExecutionResult>;
    const end = results.return!();

    const r = end.then(() => {
      expect(returnSpy).to.have.been.called;
    });

    pubsub.publish(FIRST_EVENT, {});

    return r;
  });

});
