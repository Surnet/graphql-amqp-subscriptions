import { PubSubEngine } from 'graphql-subscriptions';
import amqp from 'amqplib';
import Debug from 'debug';
import { EventEmitter } from 'events';

import { PubSubAMQPOptions } from './interfaces';
import { AMQPPublisher } from './amqp/publisher';
import { AMQPSubscriber } from './amqp/subscriber';
import { PubSubAsyncIterator } from './pubsub-async-iterator';

const logger = Debug('AMQPPubSub');

export class AMQPPubSub implements PubSubEngine {

  private connection: amqp.Connection;
  private exchange: string;
  private emitter: EventEmitter;

  private publisher: AMQPPublisher;
  private subscriber: AMQPSubscriber;

  private subscriptionMap: { [subId: number]: { routingKey: string, listener: (message: any) => void } };
  private consumerMap: { [routingKey: string]: { numSubs: number, dispose: () => Promise<void> } };
  private currentSubscriptionId: number;

  constructor(
    options: PubSubAMQPOptions
  ) {
    // Setup Variables
    this.connection = options.connection;
    this.exchange = options.exchange || 'graphql_subscriptions';
    this.emitter = new EventEmitter();

    this.subscriptionMap = {};
    this.consumerMap = {};
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
    logger('Subscribe ID: "%s"', id);

    // Reigster to listen for new messages
    this.subscriptionMap[id] = {
      routingKey: routingKey,
      listener: onMessage
    };
    this.emitter.addListener(routingKey, onMessage);

    // Increment sub count if already connected
    const consumer = this.consumerMap[routingKey];
    if (consumer) {
      this.consumerMap[routingKey] = {
        ...consumer,
        numSubs: consumer.numSubs++,
      };
      return id;
    }

    // Create new consumer tracking object
    const dispose = await this.subscriber.subscribe(
      this.exchange,
      routingKey,
      (key: string, message: any) => {
        this.emitter.emit(key, message);
      }
    );
    this.consumerMap[routingKey] = { numSubs: 1, dispose };
    return id;
  }

  public async unsubscribe(subId: number): Promise<void> {
    logger('Unsubscribe ID: "%s"', subId);
    const sub = this.subscriptionMap[subId];
    if (!sub) {
      throw new Error(`There is no subscription with ID "${subId}"`);
    }
    // Unregister
    const { routingKey, listener } = sub;
    delete this.subscriptionMap[subId];
    this.emitter.removeListener(routingKey, listener);

    const consumer = this.consumerMap[routingKey];
    if (!consumer) {
      throw new Error(`There is no consumer for Routing Key "${routingKey}"`);
    }

    // Decrement sub count and remove if empty
    consumer.numSubs--;
    if (consumer.numSubs <= 0) {
      /* Note: Always remove from map before disposing.
       * This allows a new subscribe call with the same routing key
       * to resolve with a new consumer.
       *
       * In some cases this could lead to churn if subs for a given
       * routing key are contantly fluctating between n and 0 subs.
       */
      delete this.consumerMap[subId];
      await consumer.dispose();
    }
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, triggers);
  }
}
