import amqp from 'amqplib';

export class AMQPPublisher {

  private channel: amqp.Channel | null = null;

  constructor(
    private connection: amqp.Connection
  ) {

  }

  public async publish(exchange: string, routingKey: string, data: any): Promise<void> {
    let promise: PromiseLike<amqp.Channel>;
    if (this.channel) {
      promise = Promise.resolve(this.channel);
    } else {
      promise = this.connection.createChannel();
    }
    return promise
    .then(async ch => {
      return ch.assertExchange(exchange, 'topic', { durable: false, autoDelete: true })
      .then(() => {
        ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)));
        return Promise.resolve();
      })
      .catch(err => {
        return Promise.reject(err);
      });
    });
  }
}
