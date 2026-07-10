import express from 'express';
import amqp from 'amqplib';
import mysql from 'mysql2/promise';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'lms_events';

let channel;
let pool;

async function init() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3309,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'lms_payment_db',
    });
    
    // Create transactions table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        course_id INT NOT NULL,
        amount DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'pending',
        gateway VARCHAR(50),
        gateway_transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Connected to Payment DB');
  } catch (err) {
    console.error('Failed to connect to Payment DB:', err.message);
  }

  try {
    const connection = await amqp.connect(AMQP_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    console.log('Connected to RabbitMQ (Payment Service)');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
    setTimeout(init, 5000);
  }
}

init();

// Mock endpoint POST /payments/webhook/zalopay
app.post('/payments/webhook/zalopay', async (req, res) => {
  const { studentId, courseId, transactionId } = req.body;

  console.log(`[Payment] Webhook received for transaction ${transactionId}. Updating status to 'success'.`);

  if (!channel) {
    return res.status(500).json({ error: 'RabbitMQ channel not ready' });
  }

  try {
    if (pool) {
      await pool.execute(
        `INSERT INTO transactions (student_id, course_id, amount, status, gateway, gateway_transaction_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [studentId, courseId, 99.00, 'success', 'zalopay', transactionId]
      );
      console.log('[Payment DB] Transaction saved to database.');
    }
  } catch (err) {
    console.error('[Payment DB] Failed to save transaction:', err.message);
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
