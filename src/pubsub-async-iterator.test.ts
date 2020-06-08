// chai style expect().to.be.true  violates no-unused-expression
/* tslint:disable:no-unused-expression */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { spy } from 'sinon';
import sinonChai from 'sinon-chai';

import { isAsyncIterable } from 'iterall';
import { AMQPPubSub as PubSub } from './pubsub';
import { withFilter, FilterFn } from 'graphql-subscriptions';
import { ExecutionResult } from 'graphql';
import { PubSubAMQPConfig } from './amqp/interfaces';
import amqp from 'amqplib';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const expect = chai.expect;

import {
  parse,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';

import { subscribe } from 'graphql/subscription';

const FIRST_EVENT = 'FIRST_EVENT';

let config: PubSubAMQPConfig;
const defaultFilter = () => true;

async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(resolve, milliseconds);
    } catch (err) {
      reject(err);
    }
  });
}

function buildSchema(iterator: any, filterFn: FilterFn = defaultFilter) {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        testString: {
          type: GraphQLString,
          resolve: function() {
            return 'works';
          }
        }
      }
    }),
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        testSubscription: {
          type: GraphQLString,
          subscribe: withFilter(() => iterator, filterFn),
          resolve: () => {
            return 'FIRST_EVENT';
          }
        }
      }
    })
  });
}

describe('GraphQL-JS asyncIterator', () => {

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
          durable: true,
          autoDelete: true
        }
      }
    };
  });

  after(async () => {
    await sleep(100);
    return config.connection.close();
  });

  it('should allow subscriptions', async () => {
    const query = parse(`
      subscription S1 {
        testSubscription
      }
    `);
    const pubsub = new PubSub(config);
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
    const pubsub = new PubSub(config);
    const origIterator = pubsub.asyncIterator(FIRST_EVENT);
    const schema = buildSchema(origIterator, () => Promise.resolve(true));

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

    const pubsub = new PubSub(config);
    const origIterator = pubsub.asyncIterator(FIRST_EVENT);

    let counter = 0;

    const filterFn = () => {
      counter++;

      if (counter > 10) {
        const e = new Error('Infinite loop detected');
        done(e);
        throw e;
      }

      return false;
    };

    const schema = buildSchema(origIterator, filterFn);

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

    const pubsub = new PubSub(config);
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
