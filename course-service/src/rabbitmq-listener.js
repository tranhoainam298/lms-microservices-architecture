import amqp from 'amqplib';
import { enrollStudent } from './services/courseService.js';

const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'lms_events';
const QUEUE_NAME = 'course_enrollment_queue';

export async function startRabbitMQListener() {
  try {
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createChannel();
    
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
    // Create a queue for the course service to handle enrollments
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    // Bind the queue to the exchange for 'payment.success' events
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'payment.success');
    
    console.log(`[RabbitMQ] Course Service listening for 'payment.success' on queue '${QUEUE_NAME}'...`);
    
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          console.log(`[RabbitMQ] Received event 'payment.success':`, payload);
          
          const { studentId, courseId } = payload;
          if (studentId && courseId) {
            // Call the standby function to enroll the student
            const result = await enrollStudent(studentId, courseId);
            if (result.status === 200) {
              console.log(`[Course Service] Successfully enrolled student ${studentId} in course ${courseId}.`);
              channel.ack(msg); // Acknowledge message only on success
            } else {
              console.error(`[Course Service] Failed to enroll student ${studentId}:`, result.body.message);
              // Nack and requeue or send to dead-letter queue
              channel.nack(msg, false, false);
            }
          } else {
            console.error('[RabbitMQ] Invalid payload missing studentId or courseId');
            channel.ack(msg); // Ack it anyway to discard invalid message
          }
        } catch (error) {
          console.error('[RabbitMQ] Error processing message:', error);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error('[RabbitMQ] Connection failed in Course Service:', error);
    // Retry connection after 5 seconds
    setTimeout(startRabbitMQListener, 5000);
  }
}
