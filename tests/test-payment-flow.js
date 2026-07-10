const mysql = require('mysql2/promise');

async function runTest() {
  console.log('--- STARTING RABBITMQ INTEGRATION TEST ---');

  try {
    // 1. Trigger Payment Webhook
    console.log('\n1. Sending Webhook to Payment Service...');
    const payload = {
      studentId: 99,
      courseId: 101,
      transactionId: 'TXN_123'
    };

    const res = await fetch('http://localhost:3004/payments/webhook/zalopay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Webhook Response:', data);

    // 2. Wait for 2 seconds to allow RabbitMQ processing
    console.log('\n2. Waiting 2 seconds for Course Service to consume event...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Check Course DB for Enrollment
    console.log('\n3. Querying Course Service Database...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3317,
      user: 'root',
      password: 'root',
      database: 'lms_course_db'
    });

    const [rows] = await connection.execute(
      'SELECT status FROM enrollments WHERE student_id = ? AND course_id = ?',
      [99, 101]
    );

    await connection.end();

    if (rows.length > 0 && rows[0].status === 'active') {
      console.log('\n✅ RabbitMQ Integration Test Passed');
      console.log('Enrollment Record:', rows[0]);
    } else {
      console.log('\n❌ Test Failed. Record not found or not active:', rows);
    }

  } catch (err) {
    console.error('Test Error:', err);
  }
}

runTest();
