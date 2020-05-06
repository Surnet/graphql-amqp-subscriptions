import amqp from 'amqplib';
import Debug from 'debug';

import { Logger } from './common';

export class AMQPSubscriber {

  private channel: amqp.Channel | null = null;

  constructor(
    private connection: amqp.Connection,
    private logger: Debug.IDebugger
  ) {

  }

  public async subscribe(
    exchange: string,
    routingKey: string,
    action: (routingKey: string, message: any) => void
  ): Promise<() => Promise<void>> {
    // Create and bind queue
    const channel = await this.getOrCreateChannel();
    await channel.assertExchange(exchange, 'topic', { durable: false, autoDelete: false });
    const queue = await channel.assertQueue('', { exclusive: true, durable: false, autoDelete: true });
    await channel.bindQueue(queue.queue, exchange, routingKey);

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
