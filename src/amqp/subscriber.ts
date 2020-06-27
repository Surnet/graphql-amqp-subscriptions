import amqp from 'amqplib';
import Debug from 'debug';

import { Logger } from './common';
import { PubSubAMQPConfig, Exchange, Queue } from './interfaces';

export class AMQPSubscriber {
  private connection: amqp.Connection;
  private exchange: Exchange;
  private queue: Queue;
  private channel: amqp.Channel | null = null;

  constructor(
    config: PubSubAMQPConfig,
    private logger: Debug.IDebugger
  ) {
    this.connection = config.connection;
    this.exchange = {
      name: 'graphql_subscriptions',
      type: 'topic',
      options: {
        durable: false,
        autoDelete: false
      },
      ...config.exchange
    };
    this.queue = {
      options: {
        exclusive: true,
        durable: false,
        autoDelete: true
      },
      ...config.queue
    };
  }

  public async subscribe(
    routingKey: string,
    action: (routingKey: string, message: any) => void
  ): Promise<() => Promise<void>> {
    // Create and bind queue
    const channel = await this.getOrCreateChannel();
    await channel.assertExchange(this.exchange.name, this.exchange.type, this.exchange.options);
    const queue = await channel.assertQueue(this.queue.name || '', this.queue.options);
    await channel.bindQueue(queue.queue, this.exchange.name, routingKey);

    // Listen for messages
    const opts = await channel.consume(queue.queue, (msg) => {
      let parsedMessage = Logger.convertMessage(msg);
      this.logger('Message arrived from Queue "%s" (%j)', queue.queue, parsedMessage);
      action(routingKey, parsedMessage);
    }, {noAck: true});
    this.logger('Subscribed to Queue "%s" (%s)', queue.queue, opts.consumerTag);

    // Dispose callback
    return async (): Promise<void> => {
      this.logger('Disposing Subscriber to Queue "%s" (%s)', queue.queue, opts.consumerTag);
      const ch = await this.getOrCreateChannel();
      await ch.cancel(opts.consumerTag);
      if (this.queue.unbindOnDispose) {
        await ch.unbindQueue(queue.queue, this.exchange.name, routingKey);
      }
      if (this.queue.deleteOnDispose) {
        await ch.deleteQueue(queue.queue);
      }
    };
  }

  private async getOrCreateChannel(): Promise<amqp.Channel> {
    if (!this.channel) {
      this.channel = await this.connection.createChannel();
      this.channel.on('error', (err) => { this.logger('Subscriber channel error: "%j"', err); });
    }
    return this.channel;
  }
}
