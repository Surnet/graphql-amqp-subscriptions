import amqp from 'amqplib';

export class Common {

    public static convertMessage(msg: amqp.ConsumeMessage | null): any {
      let res: any = null;
      if (msg) {
        try {
          res = JSON.parse(msg.content.toString());
        } catch (e) {
          res = msg.content.toString();
        }
      }
      return res;
    }

}
