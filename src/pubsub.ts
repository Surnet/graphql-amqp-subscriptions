import { PubSubEngine } from 'graphql-subscriptions';
import amqp from 'amqplib';
import Debug from 'debug';

import { AMQPPublisher } from './amqp/publisher';
import { AMQPSubscriber } from './amqp/subscriber';
import { PubSubAMQPConfig } from './amqp/interfaces';
import { PubSubAsyncIterator } from './pubsub-async-iterator';

const logger = Debug('AMQPPubSub');

export class AMQPPubSub implements PubSubEngine {
  private publisher: AMQPPublisher;
  private subscriber: AMQPSubscriber;

  private subscriptionMap: { [subId: number]: { routingKey: string, listener: Function } };
  private subsRefsMap: { [trigger: string]: Array<number> };
  private unsubscribeMap: { [trigger: string]: () => PromiseLike<any> };
  private currentSubscriptionId: number;

  constructor(
    config: PubSubAMQPConfig
  ) {
    this.subscriptionMap = {};
    this.subsRefsMap = {};
    this.unsubscribeMap = {};
    this.currentSubscriptionId = 0;

    // Initialize AMQP Helper
    this.publisher = new AMQPPublisher(config, logger);
    this.subscriber = new AMQPSubscriber(config, logger);

    logger('Finished initializing');
  }

  public async publish(routingKey: string, payload: any): Promise<void> {
    return this.publisher.publish(routingKey, payload);
  }

  public async subscribe(routingKey: string, onMessage: (message: any) => void): Promise<number> {
    const id = this.currentSubscriptionId++;

    if (routingKey === 'fanout') {
      routingKey = Math.random().toString(36).substring(2);
    }

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
      try {
        const disposer = await this.subscriber.subscribe(routingKey, this.onMessage.bind(this));

        this.subsRefsMap[routingKey] = [...(this.subsRefsMap[routingKey] || []), id];

        if (this.unsubscribeMap[routingKey]) {
          return disposer();
        }

        this.unsubscribeMap[routingKey] = disposer;

        return Promise.resolve(id);
      } catch(err) {
        logger(err)
        return Promise.reject(id);
      }
    }
  }

  public unsubscribe(subId: number): Promise<void> {
    const routingKey = this.subscriptionMap[subId].routingKey;
    const refs = this.subsRefsMap[routingKey];

    logger('Unsubscribing from subId: "%d", with routing key: "%s". Refs = "%j"', subId, routingKey, refs);

    if (!refs) {
      throw new Error(`There is no subscription of id "${subId}"`);
    }

    if (refs.length === 1) {
      delete this.subscriptionMap[subId];
      return this.unsubscribeForKey(routingKey);
    } else {
      const index = refs.indexOf(subId);
      const newRefs = index === -1 ? refs : [...refs.slice(0, index), ...refs.slice(index + 1)];

      this.subsRefsMap[routingKey] = newRefs;

      delete this.subscriptionMap[subId];
    }

    return Promise.resolve();
  }

  public asyncIterator<T>(eventName: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, eventName);
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
    logger('unsubscribeForKey: "%s"', routingKey);

    try {
      await this.unsubscribeMap[routingKey]();
    } catch (err) {
      logger(err);
    }

    delete this.subsRefsMap[routingKey];
    delete this.unsubscribeMap[routingKey];
  }

}
