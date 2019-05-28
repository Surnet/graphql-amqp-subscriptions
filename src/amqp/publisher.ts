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
    this.logger('Publishing message to exchange "%s" for key "%s" (%j)', this.exchange.name, routingKey, data);

    let promise: PromiseLike<amqp.Channel>;

    if (this.channel) {
      promise = Promise.resolve(this.channel);
    } else {
      promise = this.connection.createChannel();
    }

    try {
      const ch = await promise;

      this.channel = ch;

      await ch.assertExchange(this.exchange.name, this.exchange.type, { ...this.exchange.options });
      await ch.publish(this.exchange.name, routingKey, Buffer.from(JSON.stringify(data)));

      this.logger('Message sent to Exchange "%s" with Routing Key "%s" (%j)', this.exchange.name, routingKey, data);

      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
