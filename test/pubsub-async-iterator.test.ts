import amqp from 'amqplib';
import { beforeAll, afterAll, expect } from '@jest/globals';
import { isAsyncIterable } from 'iterall';
import { parse, GraphQLSchema, GraphQLObjectType, GraphQLString, ExecutionResult, subscribe } from 'graphql';
import { withFilter, FilterFn } from 'graphql-subscriptions';

import { AMQPPubSub } from '../src';
import { PubSubAMQPConfig } from '../src/amqp/interfaces';

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
      },
      queue: {
        options: {
          exclusive: true,
          durable: false,
          autoDelete: true
        }
      }
    };
  });

  afterAll(async () => {
    await sleep(100);
    return config.connection.close();
  });

  it('should allow subscriptions', async () => {
    const document = parse(`
      subscription S1 {
        testSubscription
      }
    `);
    const pubsub = new AMQPPubSub(config);
    const origIterator = pubsub.asyncIterator(FIRST_EVENT);
    const schema = buildSchema(origIterator);

    const results = await subscribe({ document, schema }) as AsyncIterator<ExecutionResult>;
    const payload1 = results.next();

    expect(isAsyncIterable(results)).toBe(true);

    const r = payload1.then(res => {
      expect(res.value.data!.testSubscription).toEqual('FIRST_EVENT');
    });

    setTimeout(() => {
      pubsub.publish(FIRST_EVENT, {});
    }, 100);

    return r;
  });

  it('should allow async filter', async () => {
    const document = parse(`
      subscription S1 {
        testSubscription
      }
    `);
    const pubsub = new AMQPPubSub(config);
    const origIterator = pubsub.asyncIterator(FIRST_EVENT);
    const schema = buildSchema(origIterator, () => Promise.resolve(true));

    const results = await subscribe({ document, schema }) as AsyncIterator<ExecutionResult>;
    const payload1 = results.next();

    expect(isAsyncIterable(results)).toBe(true);

    const r = payload1.then(res => {
      expect(res.value.data!.testSubscription).toEqual('FIRST_EVENT');
    });

    setTimeout(() => {
      pubsub.publish(FIRST_EVENT, {});
    }, 100);

    return r;
  });

  it('should detect when the payload is done when filtering', (done) => {
    const document = parse(`
      subscription S1 {
        testSubscription
      }
    `);

    const pubsub = new AMQPPubSub(config);
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

    Promise.resolve(subscribe({ document, schema })).then((results: AsyncIterator<ExecutionResult> | ExecutionResult) => {
      expect(isAsyncIterable(results)).toBe(true);
      results = <AsyncIterator<ExecutionResult>>results;

      results.next();
      results.return!();

      setTimeout(() => {
        pubsub.publish(FIRST_EVENT, {});
      }, 100);

      setTimeout(() => {
        done();
      }, 500);
    });
  });

  it('should clear event handlers', async () => {
    const document = parse(`
      subscription S1 {
        testSubscription
      }
    `);

    const pubSub = new AMQPPubSub(config);
    const origIterator = pubSub.asyncIterator(FIRST_EVENT);
    const returnSpy = jest.spyOn(origIterator, 'return');
    const schema = buildSchema(origIterator);

    const results = await subscribe({ document, schema }) as AsyncIterator<ExecutionResult>;
    const end = results.return!();

    const r = end.then(() => {
      expect(returnSpy).toHaveBeenCalled();
    });

    void pubSub.publish(FIRST_EVENT, {});

    return r;
  });
});
