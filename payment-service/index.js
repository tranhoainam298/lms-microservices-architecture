import express from 'express';
import amqp from 'amqplib';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004; // payment-service on 3004?
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'lms_events';

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(AMQP_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    console.log('Connected to RabbitMQ (Payment Service)');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

connectRabbitMQ();

// Mock endpoint POST /payments/webhook/zalopay
app.post('/payments/webhook/zalopay', async (req, res) => {
  const { studentId, courseId, transactionId } = req.body;

  // In a real scenario, we would verify the signature from ZaloPay
  // and update the transaction status in the database to 'success'.
  console.log(`[Payment] Webhook received for transaction ${transactionId}. Updating status to 'success'.`);

  if (!channel) {
    return res.status(500).json({ error: 'RabbitMQ channel not ready' });
  }

  const payload = {
    studentId,
    courseId,
    transactionId,
    timestamp: new Date().toISOString()
  };

  // Publish to lms_events exchange with routing key 'payment.success'
  const routingKey = 'payment.success';
  channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(payload)));

  console.log(`[RabbitMQ] Published event '${routingKey}':`, payload);

  res.status(200).json({ message: 'Webhook processed successfully' });
});

app.listen(PORT, () => {
  console.log(`Payment Service is running on port ${PORT}`);
});
