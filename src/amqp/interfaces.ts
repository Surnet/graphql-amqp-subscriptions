import amqp from 'amqplib';

export interface Exchange {
  name: string;
  type: string;
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
