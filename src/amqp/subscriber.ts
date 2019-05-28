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
    private config: PubSubAMQPConfig,
    private logger: Debug.IDebugger
  ) {
    this.connection = config.connection;
    this.exchange = config.exchange;
    this.queue = config.queue;
  }

  public async subscribe(routingKey: string, action: (routingKey: string, message: any) => void): Promise<() => PromiseLike<any>> {
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

      const queue = await ch.assertQueue(this.queue.name || '', { ...this.queue.options });

      await ch.bindQueue(queue.queue, this.exchange.name, routingKey);

      const opts = await ch.consume(queue.queue, (msg) => {
        let parsedMessage = Logger.convertMessage(msg);
        this.logger('Message arrived from Queue "%s" (%j)', queue.queue, parsedMessage);
        action(routingKey, parsedMessage);
      }, {noAck: true});

      this.logger('Subscribed to Queue "%s" (%s)', queue.queue, opts.consumerTag);

      const disposer = (): PromiseLike<any> => {
        this.logger('Disposing Subscriber to Queue "%s" (%s)', queue.queue, opts.consumerTag);

        return Promise.all([
          ch.cancel(opts.consumerTag),
          ch.unbindQueue(queue.queue, this.exchange.name, routingKey),
          ch.deleteQueue(queue.queue)
        ]);
      };

      return disposer;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
