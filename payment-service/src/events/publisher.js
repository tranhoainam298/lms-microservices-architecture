import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';

export const LMS_EVENT_EXCHANGE = 'lms_events';

export const PAYMENT_EVENT_DEFINITIONS = Object.freeze({
  succeeded: Object.freeze({
    eventType: 'PaymentSucceededEvent',
    routingKey: 'payment.succeeded'
  }),
  failed: Object.freeze({
    eventType: 'PaymentFailedEvent',
    routingKey: 'payment.failed'
  })
});

export function createPaymentEventEnvelope(eventType, data, now = new Date()) {
  return {
    eventId: randomUUID(),
    eventType,
    eventVersion: 1,
    occurredAt: now.toISOString(),
    source: 'payment-service',
    data
  };
}

function safeErrorCode(error) {
  return error?.code || error?.name || 'UNKNOWN';
}

function publishWithConfirmation(channel, exchange, routingKey, envelope, confirmTimeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      const error = new Error('RabbitMQ publisher confirmation timed out.');
      error.code = 'RABBITMQ_CONFIRM_TIMEOUT';
      finish(error);
    }, confirmTimeoutMs);

    try {
      channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(envelope)),
        {
          persistent: true,
          contentType: 'application/json',
          contentEncoding: 'utf-8',
          messageId: envelope.eventId,
          type: envelope.eventType,
          timestamp: Math.floor(Date.parse(envelope.occurredAt) / 1000)
        },
        finish
      );
    } catch (error) {
      finish(error);
    }
  });
}

export function createPaymentEventPublisher({
  amqpUrl,
  exchange = LMS_EVENT_EXCHANGE,
  logger = console,
  connectionTimeoutMs = 3000,
  confirmTimeoutMs = 3000
}) {
  let connection = null;
  let channel = null;
  let connectPromise = null;

  function clearConnection(expectedConnection) {
    if (expectedConnection && connection !== expectedConnection) return;
    connection = null;
    channel = null;
  }

  async function discardConnection() {
    const staleConnection = connection;
    clearConnection();
    if (staleConnection) {
      try {
        await staleConnection.close();
      } catch {
        // The connection is already unusable. The next publish reconnects.
      }
    }
  }

  async function connect() {
    const nextConnection = await amqp.connect(amqpUrl, { timeout: connectionTimeoutMs });
    nextConnection.on('error', (error) => {
      logger.error(`RabbitMQ payment publisher connection error (${safeErrorCode(error)}).`);
    });
    nextConnection.on('close', () => clearConnection(nextConnection));

    let nextChannel;
    try {
      nextChannel = await nextConnection.createConfirmChannel();
      nextChannel.on('error', (error) => {
        logger.error(`RabbitMQ payment publisher channel error (${safeErrorCode(error)}).`);
      });
      nextChannel.on('close', () => {
        if (channel === nextChannel) {
          clearConnection(nextConnection);
          void nextConnection.close().catch(() => {});
        }
      });
      await nextChannel.assertExchange(exchange, 'topic', { durable: true });
    } catch (error) {
      try {
        await nextConnection.close();
      } catch {
        // Preserve the original channel/exchange setup error.
      }
      throw error;
    }

    connection = nextConnection;
    channel = nextChannel;
    return nextChannel;
  }

  async function ensureChannel() {
    if (channel) return channel;
    if (!connectPromise) {
      connectPromise = connect().finally(() => {
        connectPromise = null;
      });
    }
    return connectPromise;
  }

  async function start() {
    try {
      await ensureChannel();
      logger.log('Connected to RabbitMQ (Payment Service publisher)');
      return true;
    } catch (error) {
      await discardConnection();
      logger.error(`RabbitMQ payment publisher is unavailable (${safeErrorCode(error)}).`);
      return false;
    }
  }

  async function publish(definition, data) {
    const envelope = createPaymentEventEnvelope(definition.eventType, data);

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const activeChannel = await ensureChannel();
        await publishWithConfirmation(
          activeChannel,
          exchange,
          definition.routingKey,
          envelope,
          confirmTimeoutMs
        );
        return true;
      } catch (error) {
        await discardConnection();
        if (attempt === 2) {
          logger.error(
            `Could not publish ${definition.eventType} after reconnect (${safeErrorCode(error)}).`
          );
          return false;
        }
      }
    }

    return false;
  }

  return {
    start,
    close: discardConnection,
    publishPaymentSucceeded(data) {
      return publish(PAYMENT_EVENT_DEFINITIONS.succeeded, data);
    },
    publishPaymentFailed(data) {
      return publish(PAYMENT_EVENT_DEFINITIONS.failed, data);
    }
  };
}
