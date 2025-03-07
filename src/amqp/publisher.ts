import amqp from 'amqplib';
import Debug from 'debug';

import { PubSubAMQPConfig, Exchange } from './interfaces';

export class AMQPPublisher {
  private connection: amqp.Connection;
  private exchange: Exchange;
  private channelPromise: Promise<amqp.Channel> | null = null;

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
  }

  public async publish(routingKey: string, data: any, options?: amqp.Options.Publish): Promise<void> {
    const channel = await this.getOrCreateChannel();
    await channel.assertExchange(this.exchange.name, this.exchange.type, this.exchange.options);
    channel.publish(this.exchange.name, routingKey, Buffer.from(JSON.stringify(data)), options);
    this.logger('Message sent to Exchange "%s" with Routing Key "%s" (%j)', this.exchange.name, routingKey, data);
  }

  private async getOrCreateChannel(): Promise<amqp.Channel> {
    if (!this.channelPromise) {
      this.channelPromise = this.connection.createChannel()
      .then(channel => {
        channel.on('error', (error) => {
          this.logger('Publisher channel error: "%j"', error);
        });
        return channel;
      });
    }
    return this.channelPromise;
  }
}
