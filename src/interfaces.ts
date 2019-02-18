import amqp from 'amqplib';

export interface PubSubAMQPOptions {
  connection: amqp.Connection;
  exchange?: string;
}
