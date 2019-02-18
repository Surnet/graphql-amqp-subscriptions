import amqp from 'amqplib';

export function convertMessage(msg: amqp.ConsumeMessage | null): any {
  let res: any;
  if (msg) {
    try {
      res = JSON.parse(msg.content.toString());
    } catch {
      res = msg.content;
    }
  } else {
    res = null;
  }
  return res;
}
