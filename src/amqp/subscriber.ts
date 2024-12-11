import amqp from 'amqplib';
import Debug from 'debug';

import { Common } from './common';
import { PubSubAMQPConfig, Exchange, Queue } from './interfaces';

export class AMQPSubscriber {
  private connection: amqp.Connection;
  private exchange: Exchange;
  private queue: Queue;
  private channelP: Promise<amqp.Channel> | null = null;

  constructor(config: PubSubAMQPConfig, private logger: Debug.IDebugger) {
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
    action: (routingKey: string, content: any, message: amqp.ConsumeMessage | null) => void,
    arguments_?: any,
    options?: amqp.Options.Consume
  ): Promise<() => Promise<void>> {
    // Create and bind queue
    const channel = await this.getOrCreateChannel();
    await channel.assertExchange(this.exchange.name, this.exchange.type, this.exchange.options);
    const queue = await channel.assertQueue(this.queue.name ?? '', this.queue.options);
    await channel.bindQueue(queue.queue, this.exchange.name, routingKey, arguments_);

    // Listen for messages
    const options_ = await channel.consume(queue.queue, (message) => {
      const content = Common.convertMessage(message);
      this.logger('Message arrived from Queue "%s" (%j)', queue.queue, content);
      action(routingKey, content, message);
    }, { noAck: true, ...options });
    this.logger('Subscribed to Queue "%s" (%s)', queue.queue, options_.consumerTag);

    // Dispose callback
    return async (): Promise<void> => {
      this.logger('Disposing Subscriber to Queue "%s" (%s)', queue.queue, options_.consumerTag);
      const ch = await this.getOrCreateChannel();
      await ch.cancel(options_.consumerTag);
      if (this.queue.unbindOnDispose) {
        await ch.unbindQueue(queue.queue, this.exchange.name, routingKey);
      }
      if (this.queue.deleteOnDispose) {
        await ch.deleteQueue(queue.queue);
      }
    };
  }

  private async getOrCreateChannel(): Promise<amqp.Channel> {
    if (!this.channelP) {
      this.channelP = new Promise((resolve, reject) => {
        this.connection.createChannel().then((channel) => {
          channel.on('error', (error) => {
            this.logger('Subscriber channel error: "%j"', error);
          });
          resolve(channel);
        }).catch((error) => reject(error));
      });
    }
    return this.channelP;
  }
}
