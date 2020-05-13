import amqp from 'amqplib';
import Debug from 'debug';

export class AMQPPublisher {

  private channel: amqp.Channel | null = null;

  constructor(
    private connection: amqp.Connection,
    private logger: Debug.IDebugger
  ) {

  }

  public async publish(exchange: string, routingKey: string, data: any): Promise<void> {
    const channel = await this.getOrCreateChannel();
    await channel.assertExchange(exchange, 'topic', { durable: false, autoDelete: false });
    await channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)));
    this.logger('Message sent to Exchange "%s" with Routing Key "%s" (%j)', exchange, routingKey, data);
  }

  private async getOrCreateChannel(): Promise<amqp.Channel> {
    if (!this.channel) {
      this.channel = await this.connection.createChannel();
      this.channel.on('error', (err) => { this.logger('Publisher channel error: "%j"', err); });
    }
    return this.channel;
  }
}
