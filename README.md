# graphql-amqp-subscriptions

This package implements the PubSubEngine Interface from the graphql-subscriptions package.
It allows you to connect your subscriptions manager to a AMQP PubSub mechanism.

This package is influenced by [graphql-redis-subscriptions](https://github.com/davidyaha/graphql-redis-subscriptions) and [graphql-rabbitmq-subscriptions](https://github.com/cdmbase/graphql-rabbitmq-subscriptions).

[![npm Version](https://img.shields.io/npm/v/graphql-amqp-subscriptions.svg)](https://www.npmjs.com/package/graphql-amqp-subscriptions)
[![npm Downloads](https://img.shields.io/npm/dm/graphql-amqp-subscriptions.svg)](https://www.npmjs.com/package/graphql-amqp-subscriptions)
[![CircleCI](https://circleci.com/gh/Surnet/graphql-amqp-subscriptions.svg?style=svg)](https://circleci.com/gh/Surnet/graphql-amqp-subscriptions)
[![Known Vulnerabilities](https://snyk.io/test/github/Surnet/graphql-amqp-subscriptions/badge.svg)](https://snyk.io/test/github/Surnet/graphql-amqp-subscriptions)

# Basic usage

```javascript
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import amqp from 'amqplib';

amqp.connect('amqp://guest:guest@localhost:5672?heartbeat=30')
.then(conn => {
  const pubsub = new AMQPPubSub({
    connection: conn
  });
  // Use the pubsub instance from here
})
.catch(err => {
  console.error(err);
});
```

# Debug

This package uses Debug.
To show the logs run your app with the environment variable DEBUG="AMQPPubSub"
