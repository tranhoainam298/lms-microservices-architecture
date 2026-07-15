import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';

const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
export const LMS_EVENT_EXCHANGE = 'lms_events';
export const USER_LOGGED_IN_ROUTING_KEY = 'user.loggedin';
let connection = null;
let channel = null;
let connectionPromise = null;

const DEFAULT_CONNECTION_TIMEOUT_MS = 3000;
const DEFAULT_CONFIRM_TIMEOUT_MS = 3000;

function positiveTimeout(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clearBrokerState(activeConnection = connection) {
  if (connection === activeConnection) {
    connection = null;
    channel = null;
  }
}

async function createBrokerChannel() {
  const nextConnection = await amqp.connect(rabbitMqUrl, {
    timeout: positiveTimeout(
      process.env.RABBITMQ_CONNECTION_TIMEOUT_MS,
      DEFAULT_CONNECTION_TIMEOUT_MS
    )
  });
  let nextChannel;
  try {
    nextConnection.on('error', (error) => {
      console.error(`[RABBITMQ] Connection error (${error?.code || error?.name || 'UNKNOWN'}).`);
    });
    nextConnection.on('close', () => {
      clearBrokerState(nextConnection);
      console.warn('[RABBITMQ] Connection closed; the next publish will reconnect.');
    });

    nextChannel = await nextConnection.createConfirmChannel();
    nextChannel.on('error', (error) => {
      console.error(`[RABBITMQ] Channel error (${error?.code || error?.name || 'UNKNOWN'}).`);
    });
    nextChannel.on('close', () => {
      if (channel === nextChannel) {
        clearBrokerState(nextConnection);
        void nextConnection.close().catch(() => {});
      }
    });

    await nextChannel.assertExchange(LMS_EVENT_EXCHANGE, 'topic', { durable: true });
  } catch (error) {
    await nextConnection.close().catch(() => {});
    throw error;
  }
  connection = nextConnection;
  channel = nextChannel;
  console.log('[RABBITMQ] Connected successfully');

  return nextChannel;
}

async function getChannel() {
  if (channel) {
    return channel;
  }

  if (!connectionPromise) {
    connectionPromise = createBrokerChannel().finally(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
}

async function discardConnection() {
  const staleConnection = connection;
  clearBrokerState(staleConnection);
  if (staleConnection) {
    await staleConnection.close().catch(() => {});
  }
}

function publishWithConfirmation(activeChannel, routingKey, eventData, confirmTimeoutMs) {
  const messageBuffer = Buffer.from(JSON.stringify(eventData));
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
      activeChannel.publish(
        LMS_EVENT_EXCHANGE,
        routingKey,
        messageBuffer,
        {
          persistent: true,
          contentType: 'application/json',
          contentEncoding: 'utf-8',
          messageId: eventData.eventId,
          timestamp: Math.floor(Date.parse(eventData.occurredAt) / 1000),
          type: eventData.eventType
        },
        finish
      );
    } catch (error) {
      finish(error);
    }
  });
}

export async function connectRabbitMQ() {
  try {
    await getChannel();
    return true;
  } catch (error) {
    console.error(`[RABBITMQ] Connection failed (${error?.code || error?.name || 'UNKNOWN'}).`);
    return false;
  }
}

export function createUserLoggedInEvent({ userId, role, loginTime }) {
  return {
    eventId: randomUUID(),
    eventType: 'UserLoggedInEvent',
    eventVersion: 1,
    occurredAt: loginTime,
    source: 'user-service',
    data: { userId, role, loginTime }
  };
}

export async function publishEvent(routingKey, eventData) {
  const confirmTimeoutMs = positiveTimeout(
    process.env.RABBITMQ_CONFIRM_TIMEOUT_MS,
    DEFAULT_CONFIRM_TIMEOUT_MS
  );

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const activeChannel = await getChannel();
      await publishWithConfirmation(activeChannel, routingKey, eventData, confirmTimeoutMs);
      console.log(`[RABBITMQ] Event published with key ${routingKey}`);
      return true;
    } catch (error) {
      await discardConnection();
      if (attempt === 2) {
        console.error(`[RABBITMQ] Failed to publish event (${error?.code || error?.name || 'UNKNOWN'}).`);
        return false;
      }
    }
  }

  return false;
}
