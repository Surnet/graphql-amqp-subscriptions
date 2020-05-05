import { PubSubEngine } from 'graphql-subscriptions';
import amqp from 'amqplib';
import Debug from 'debug';

import { PubSubAMQPOptions } from './interfaces';
import { AMQPPublisher } from './amqp/publisher';
import { AMQPSubscriber } from './amqp/subscriber';
import { PubSubAsyncIterator } from './pubsub-async-iterator';

const logger = Debug('AMQPPubSub');

export class AMQPPubSub implements PubSubEngine {

  private connection: amqp.Connection;
  private exchange: string;

  private publisher: AMQPPublisher;
  private subscriber: AMQPSubscriber;

  private subscriptionMap: { [subId: number]: { routingKey: string, listener: Function } };
  private subsRefsMap: { [trigger: string]: Array<number> };
  private unsubscribeMap: { [trigger: string]: () => PromiseLike<any> };
  private currentSubscriptionId: number;

  constructor(
    options: PubSubAMQPOptions
  ) {
    // Setup Variables
    this.connection = options.connection;
    this.exchange = options.exchange || 'graphql_subscriptions';

    this.subscriptionMap = {};
    this.subsRefsMap = {};
    this.unsubscribeMap = {};
    this.currentSubscriptionId = 0;

    // Initialize AMQP Helper
    this.publisher = new AMQPPublisher(this.connection, logger);
    this.subscriber = new AMQPSubscriber(this.connection, logger);

    logger('Finished initializing');
  }

  public async publish(routingKey: string, payload: any): Promise<void> {
    logger('Publishing message to exchange "%s" for key "%s" (%j)', this.exchange, routingKey, payload);
    return this.publisher.publish(this.exchange, routingKey, payload);
  }

  public async subscribe(routingKey: string, onMessage: (message: any) => void): Promise<number> {
    const id = this.currentSubscriptionId++;
    this.subscriptionMap[id] = {
      routingKey: routingKey,
      listener: onMessage
    };

    const refs = this.subsRefsMap[routingKey];
    if (refs && refs.length > 0) {
      const newRefs = [...refs, id];
      this.subsRefsMap[routingKey] = newRefs;
      return Promise.resolve(id);
    } else {
      return this.subscriber.subscribe(this.exchange, routingKey, this.onMessage.bind(this))
      .then(disposer => {
        this.subsRefsMap[routingKey] = [
          ...(this.subsRefsMap[routingKey] || []),
          id,
        ];
        if (this.unsubscribeMap[routingKey]) {
          return disposer();
        }
        this.unsubscribeMap[routingKey] = disposer;
        return Promise.resolve(id);
      });
    }
  }

  public unsubscribe(subId: number): Promise<void> {
    const routingKey = this.subscriptionMap[subId].routingKey;
    const refs = this.subsRefsMap[routingKey];

    if (!refs) {
      throw new Error(`There is no subscription of id "${subId}"`);
    }

    if (refs.length === 1) {
      delete this.subscriptionMap[subId];
      return this.unsubscribeForKey(routingKey);
    } else {
      const index = refs.indexOf(subId);
      const newRefs =
        index === -1
          ? refs
          : [...refs.slice(0, index), ...refs.slice(index + 1)];
      this.subsRefsMap[routingKey] = newRefs;
      delete this.subscriptionMap[subId];
    }
    return Promise.resolve();
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, triggers);
  }

  private onMessage(routingKey: string, message: any): void {
    const subscribers = this.subsRefsMap[routingKey];

    // Don't work for nothing..
    if (!subscribers || !subscribers.length) {
      this.unsubscribeForKey(routingKey);
      return;
    }

    for (const subId of subscribers) {
      this.subscriptionMap[subId].listener(message);
    }
  }

  private async unsubscribeForKey(routingKey: string): Promise<void> {
    const disposer = this.unsubscribeMap[routingKey];
    delete this.unsubscribeMap[routingKey];
    delete this.subsRefsMap[routingKey];
    await disposer();
  }

}
