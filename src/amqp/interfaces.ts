import {Options, Connection} from 'amqplib';

export interface Exchange {
  name: string;
  type: string;
  options?: Options.AssertExchange;
}

export interface Queue {
  name?: string;
  options?: Options.AssertQueue;
  unbindOnDispose?: boolean;
  deleteOnDispose?: boolean;
}

export interface PubSubAMQPConfig {
  connection: Connection;
  exchange?: Exchange;
  queue?: Queue;
}
