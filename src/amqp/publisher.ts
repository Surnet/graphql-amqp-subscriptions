import amqp from 'amqplib';
import Debug from 'debug';

import { PubSubAMQPConfig, Exchange, Queue } from './interfaces';

export class AMQPPublisher {
  private connection: amqp.Connection;
  private exchange: Exchange;
  private channel: amqp.Channel | null = null;

  constructor(
    private config: PubSubAMQPConfig,
    private logger: Debug.IDebugger
  ) {
    this.connection = config.connection;
    this.exchange = config.exchange;
  }

  public async publish(routingKey: string, data: any): Promise<void> {
    const channel = await this.getOrCreateChannel();
    await channel.assertExchange(this.exchange.name, this.exchange.type, { ...this.exchange.options });
    await channel.publish(this.exchange.name, routingKey, Buffer.from(JSON.stringify(data)));
    this.logger('Message sent to Exchange "%s" with Routing Key "%s" (%j)', this.exchange.name, routingKey, data);
  }

  private async getOrCreateChannel(): Promise<amqp.Channel> {
    if (!this.channel) {
      this.channel = await this.connection.createChannel();
      this.channel.on('error', (err) => { this.logger('Publisher channel error: "%j"', err); });
    }
    return this.channel;
  }
}
