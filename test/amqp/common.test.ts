import { expect } from 'chai';
import 'mocha';

import { Common } from '../../src/amqp/common';

describe('Common', () => {
  it('should convert a string to a string', () => {
    const message = Common.convertMessage({
      fields: {
        deliveryTag: 1,
        redelivered: false,
        exchange: 'exchange',
        routingKey: 'test.test',
        consumerTag: 'test.tag'
      },
      properties: {
        contentType: undefined,
        contentEncoding: undefined,
        headers: {},
        deliveryMode: undefined,
        priority: undefined,
        correlationId: undefined,
        replyTo: undefined,
        expiration: undefined,
        messageId: undefined,
        timestamp: undefined,
        type: undefined,
        userId: undefined,
        appId: undefined,
        clusterId: undefined
      },
      content: Buffer.from('test')
    });
    expect(message).to.exist;
    expect(message).to.equal('test');
  });

  it('should convert a stringified JSON to a JSON', () => {
    const message = Common.convertMessage({
      fields: {
        deliveryTag: 1,
        redelivered: false,
        exchange: 'exchange',
        routingKey: 'test.test',
        consumerTag: 'test.tag'
      },
      properties: {
        contentType: undefined,
        contentEncoding: undefined,
        headers: {},
        deliveryMode: undefined,
        priority: undefined,
        correlationId: undefined,
        replyTo: undefined,
        expiration: undefined,
        messageId: undefined,
        timestamp: undefined,
        type: undefined,
        userId: undefined,
        appId: undefined,
        clusterId: undefined
      },
      content: Buffer.from('{"test":"data"}')
    });
    expect(message).to.exist;
    expect(message.test).to.equal('data');
  });
});
