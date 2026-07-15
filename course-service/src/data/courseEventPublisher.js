import { randomUUID } from 'node:crypto';
import amqp from 'amqplib';

export const LMS_EVENT_EXCHANGE = 'lms_events';
export const COURSE_ACCESS_ACTIVATED_ROUTING_KEY = 'course.access.activated';

let connection = null;
let channel = null;
let connectPromise = null;

const DEFAULT_CONNECTION_TIMEOUT_MS = 3000;
const DEFAULT_CONFIRM_TIMEOUT_MS = 3000;

function safeErrorCode(error) {
  return error?.code || error?.name || 'UNKNOWN';
}

function positiveTimeout(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clearConnection(expectedConnection) {
  if (expectedConnection && connection !== expectedConnection) return;
  connection = null;
  channel = null;
}

async function discardConnection() {
  const staleConnection = connection;
  clearConnection();
  if (staleConnection) {
    await staleConnection.close().catch(() => {});
  }
}

async function createPublisher() {
  const nextConnection = await amqp.connect(
    process.env.AMQP_URL || 'amqp://localhost:5672',
    {
      timeout: positiveTimeout(
        process.env.RABBITMQ_CONNECTION_TIMEOUT_MS,
        DEFAULT_CONNECTION_TIMEOUT_MS
      )
    }
  );
  nextConnection.on('error', (error) => {
    console.error(`[RabbitMQ] Course event publisher connection error (${safeErrorCode(error)}).`);
  });
  nextConnection.once('close', () => clearConnection(nextConnection));

  let nextChannel;
  try {
    nextChannel = await nextConnection.createConfirmChannel();
    nextChannel.on('error', (error) => {
      console.error(`[RabbitMQ] Course event publisher channel error (${safeErrorCode(error)}).`);
    });
    nextChannel.once('close', () => {
      if (channel === nextChannel) {
        clearConnection(nextConnection);
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
  return nextChannel;
}

async function getChannel() {
  if (channel) return channel;
  if (!connectPromise) {
    connectPromise = createPublisher().finally(() => {
      connectPromise = null;
    });
  }
  return connectPromise;
}

export function createCourseAccessActivatedEvent({ studentId, courseId, enrollmentId, activatedAt }) {
  return {
    eventId: randomUUID(),
    eventType: 'CourseAccessActivatedEvent',
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    source: 'course-service',
    data: {
      studentId,
      courseId,
      enrollmentId,
      activatedAt
    }
  };
}

export async function publishCourseAccessActivated({ studentId, courseId, enrollmentId, activatedAt }) {
  const event = createCourseAccessActivatedEvent({ studentId, courseId, enrollmentId, activatedAt });
  const payload = Buffer.from(JSON.stringify(event));
  const confirmTimeoutMs = positiveTimeout(
    process.env.RABBITMQ_CONFIRM_TIMEOUT_MS,
    DEFAULT_CONFIRM_TIMEOUT_MS
  );

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const activeChannel = await getChannel();
      await new Promise((resolve, reject) => {
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
            COURSE_ACCESS_ACTIVATED_ROUTING_KEY,
            payload,
            {
              persistent: true,
              contentType: 'application/json',
              contentEncoding: 'utf-8',
              messageId: event.eventId,
              type: event.eventType,
              timestamp: Math.floor(Date.parse(event.occurredAt) / 1000)
            },
            finish
          );
        } catch (error) {
          finish(error);
        }
      });
      return event;
    } catch (error) {
      await discardConnection();
      if (attempt === 2) throw error;
    }
  }

  return event;
}
