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
  ): Promise<() => PromiseLike<any>> {
    let promise: PromiseLike<amqp.Channel>;
    if (this.channel) {
      promise = Promise.resolve(this.channel);
    } else {
      promise = this.connection.createChannel();
    }
    return promise
    .then(async ch => {
      this.channel = ch;
      return ch.assertExchange(exchange, 'fanout', { durable: false, autoDelete: true })
      .then(() => {
        return ch.assertQueue('', { exclusive: true, durable: false, autoDelete: true });
      })
      .then(async queue => {
        return ch.bindQueue(queue.queue, exchange, routingKey)
        .then(() => {
          return queue;
        });
      })
      .then(async queue => {
        return ch.consume(queue.queue, (msg) => {
          let parsedMessage = Logger.convertMessage(msg);
          this.logger('Message arrived from Queue "%s" (%j)', queue.queue, parsedMessage);
          action(routingKey, parsedMessage);
        }, {noAck: true})
        .then(opts => {
          this.logger('Subscribed to Queue "%s" (%s)', queue.queue, opts.consumerTag);
          return ((): PromiseLike<any> => {
            this.logger('Disposing Subscriber to Queue "%s" (%s)', queue.queue, opts.consumerTag);
            return ch.cancel(opts.consumerTag);
          });
        });
      })
      .catch(err => {
        return Promise.reject(err);
      });
    });
  }

}
