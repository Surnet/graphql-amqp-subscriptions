import amqp from 'amqplib';

export interface Exchange {
  name?: string;
  type?: string;
  options?: amqp.Options.AssertExchange;
}

export interface Queue {
  name?: string;
  options?: amqp.Options.AssertQueue;
  unbindOnDispose?: boolean;
  deleteOnDispose?: boolean;
}

export interface PubSubAMQPConfig {
  connection: amqp.Connection;
  exchange?: Exchange;
  queue?: Queue;
}

export function isPubSubAMQPConfig(config: PubSubAMQPConfig | amqp.Connection): config is PubSubAMQPConfig {
  return (config as amqp.Connection).createChannel === undefined;
}
