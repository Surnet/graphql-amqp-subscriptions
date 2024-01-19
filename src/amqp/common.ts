import amqp from 'amqplib';

export class Common {
  public static convertMessage(message: amqp.ConsumeMessage | null): any {
    let response: any = null;
    if (message) {
      try {
        response = JSON.parse(message.content.toString());
      } catch {
        response = message.content.toString();
      }
    }

    return response;
  }
}
