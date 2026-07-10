import amqp from 'amqplib';

const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
let connection = null;
let channel = null;

export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(rabbitMqUrl);
    channel = await connection.createChannel();
    console.log('[RABBITMQ] Connected successfully');
  } catch (error) {
    console.error('[RABBITMQ] Connection failed:', error.message);
  }
}

export async function publishEvent(exchange, routingKey, eventData) {
  if (!channel) {
    console.error('[RABBITMQ] Channel not initialized');
    return false;
  }
  try {
    await channel.assertExchange(exchange, 'topic', { durable: true });
    const messageBuffer = Buffer.from(JSON.stringify(eventData));
    channel.publish(exchange, routingKey, messageBuffer);
    console.log(`[RABBITMQ] Event published to ${exchange} with key ${routingKey}`);
    return true;
  } catch (error) {
    console.error('[RABBITMQ] Failed to publish event:', error.message);
    return false;
  }
}
