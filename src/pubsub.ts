import amqp, { ConsumeMessage } from 'amqplib';
import Debug from 'debug';
import { type PubSubEngine } from 'graphql-subscriptions';
import { PubSubAsyncIterableIterator } from 'graphql-subscriptions/dist/pubsub-async-iterable-iterator';
import { v4 as uuidv4 } from 'uuid';

import { Exchange, PubSubAMQPConfig } from './amqp/interfaces';
import { AMQPPublisher } from './amqp/publisher';
import { AMQPSubscriber } from './amqp/subscriber';

const logger = Debug('AMQPPubSub');

export class AMQPPubSub implements PubSubEngine {
  private publisher: AMQPPublisher;
  private subscriber: AMQPSubscriber;
  private exchange: Exchange;

  private subscriptionMap: { [subId: number]: { routingKey: string; listener: (content: any, message: ConsumeMessage | null) => any } };
  private subsRefsMap: { [trigger: string]: Array<number> };
  private unsubscribeMap: { [trigger: string]: () => PromiseLike<any> };
  private currentSubscriptionId: number;

  constructor(config: PubSubAMQPConfig) {
    this.subscriptionMap = {};
    this.subsRefsMap = {};
    this.unsubscribeMap = {};
    this.currentSubscriptionId = 0;

    // Initialize AMQP Helper
    this.publisher = new AMQPPublisher(config, logger);
    this.subscriber = new AMQPSubscriber(config, logger);

    this.exchange = {
      name: 'graphql_subscriptions',
      type: 'topic',
      options: {
        durable: false,
        autoDelete: false
      },
      ...config.exchange
    };

    logger('Finished initializing');
  }

  public async publish(routingKey: string, payload: any, options?: amqp.Options.Publish): Promise<void> {
    logger('Publishing message to exchange "%s" for key "%s" (%j)', this.exchange.name, routingKey, payload);
    return this.publisher.publish(routingKey, payload, options);
  }

  public async subscribe(
    routingKey: string,
    onMessage: (content: any, message?: amqp.ConsumeMessage | null) => void,
    arguments_?: any,
    options?: amqp.Options.Consume
  ): Promise<number> {
    const id = this.currentSubscriptionId++;

    if (routingKey === 'fanout') {
      routingKey = uuidv4();
    }
    logger('Subscribing to "%s" with id: "%s"', routingKey, id);

    this.subscriptionMap[id] = {
      routingKey,
      listener: onMessage
    };

    const references = this.subsRefsMap[routingKey];
    if (references && references.length > 0) {
      const newReferences = [...references, id];
      this.subsRefsMap[routingKey] = newReferences;
      return id;
    }

    this.subsRefsMap[routingKey] = [
      ...(this.subsRefsMap[routingKey] || []),
      id
    ];

    const existingDispose = this.unsubscribeMap[routingKey];
    // Get rid of exisiting subscription while we get a new one.
    const [newDispose] = await Promise.all([
      this.subscriber.subscribe(routingKey, this.onMessage, arguments_, options),
      existingDispose ? existingDispose() : Promise.resolve()
    ]);

    this.unsubscribeMap[routingKey] = newDispose;
    return id;
  }

  public async unsubscribe(subId: number): Promise<void> {
    const sub = this.subscriptionMap[subId];
    if (!sub) {
      throw new Error(`There is no subscription for id "${subId}"`);
    }
    const { routingKey } = sub;

    const references = this.subsRefsMap[routingKey];
    if (!references) {
      throw new Error(`There is no subscription ref for routing key "${routingKey}", id "${subId}"`);
    }
    logger('Unsubscribing from "%s" with id: "%s"', routingKey, subId);

    if (references.length === 1) {
      delete this.subscriptionMap[subId];
      return this.unsubscribeForKey(routingKey);
    }

    const index = references.indexOf(subId);
    const newReferences =
      index === -1
        ? references
        : [...references.slice(0, index), ...references.slice(index + 1)];
    this.subsRefsMap[routingKey] = newReferences;
    delete this.subscriptionMap[subId];
  }

  public asyncIterableIterator<T>(triggers: string | string[]): PubSubAsyncIterableIterator<T> {
    return new PubSubAsyncIterableIterator<T>(this, triggers);
  }

  private onMessage = (routingKey: string, content: any, message: amqp.ConsumeMessage | null): void => {
    const subscribers = this.subsRefsMap[routingKey];

    // Don't work for nothing...
    if (!subscribers || subscribers.length === 0) {
      this.unsubscribeForKey(routingKey).catch((error) => {
        logger('onMessage unsubscribeForKey error "%j", Routing Key "%s"', error, routingKey);
      });
      return;
    }

    for (const subId of subscribers) {
      this.subscriptionMap[subId].listener(content, message);
    }
  };

  private async unsubscribeForKey(routingKey: string): Promise<void> {
    const dispose = this.unsubscribeMap[routingKey];
    delete this.unsubscribeMap[routingKey];
    delete this.subsRefsMap[routingKey];
    await dispose();
  }
}
