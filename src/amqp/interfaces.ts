import amqp from 'amqplib';

export interface Exchange {
  name: string;
  type: string;
  options?: {
    durable?: boolean;
    autoDelete?: boolean;
  };
}

export interface Queue {
  name?: string;
  options?: {
    exclusive?: boolean;
    durable?: boolean;
    autoDelete?: boolean;
  };
}

export interface PubSubAMQPConfig {
  connection: amqp.Connection;
  exchange: Exchange;
  queue: Queue;
}
