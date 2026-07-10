const mysql = require('mysql2/promise');

const databases = [
  {
    service: 'User Service',
    host: 'localhost',
    port: 3316,
    user: 'root',
    password: 'root',
    database: 'lms_user_db',
    table: 'users'
  },
  {
    service: 'Course Service',
    host: 'localhost',
    port: 3317,
    user: 'root',
    password: 'root',
    database: 'lms_course_db',
    table: 'courses'
  },
  {
    service: 'Exam Service',
    host: 'localhost',
    port: 3308, // Mapped to 3308 in docker-compose
    user: 'root',
    password: 'root',
    database: 'lms_exam_db',
    table: 'QuizResults' // EF Core default pluralization
  },
  {
    service: 'Payment Service',
    host: 'localhost',
    port: 3309,
    user: 'root',
    password: 'root',
    database: 'lms_payment_db',
    table: 'transactions'
  }
];

async function runHealthCheck() {
  console.log('Running Microservices Database Health Check...\n');
  
  const results = [];

  for (const dbConfig of databases) {
    const { service, host, port, user, password, database, table } = dbConfig;
    let count = '-';
    let status = '❌ FAILED';

    try {
      // 1. Connect to Database
      const connection = await mysql.createConnection({
        host,
        port,
        user,
        password,
        database
      });

      // 2. Run SELECT count
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      count = rows[0].count;
      status = '✅ OK';

      await connection.end();
    } catch (error) {
      if (error.code === 'ER_BAD_DB_ERROR') {
        status = '❌ DB MISSING';
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        status = '❌ TABLE MISSING';
      } else if (error.code === 'ECONNREFUSED') {
        status = '❌ UNREACHABLE';
      } else {
        status = `❌ ERROR: ${error.code || error.message}`;
      }
    }

    results.push({
      Service: service,
      Database: database,
      Table: table,
      Count: count,
      Status: status
    });
  }

  // 3. Log the status in a table format
  console.table(results);
}

runHealthCheck();
