const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const databases = {
  user: { host: 'localhost', port: 3316, user: 'root', password: 'root', database: 'lms_user_db' },
  course: { host: 'localhost', port: 3317, user: 'root', password: 'root', database: 'lms_course_db' },
  exam: { host: 'localhost', port: 3308, user: 'root', password: 'root', database: 'lms_exam_db' }
};

async function seedData() {
  console.log('🌱 Starting Database Seeding...');

  try {
    // 1. Seed User DB
    console.log('--- Seeding User DB ---');
    const userConn = await mysql.createConnection(databases.user);
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const users = [
      { id: 1, email: 'student@lms.edu', password_hash: passwordHash, full_name: 'Student', role: 'student' },
      { id: 2, email: 'instructor@lms.edu', password_hash: passwordHash, full_name: 'Instructor', role: 'instructor' },
      { id: 3, email: 'admin@lms.edu', password_hash: passwordHash, full_name: 'Admin', role: 'admin' }
    ];

    for (const u of users) {
      await userConn.execute(
        `INSERT IGNORE INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`,
        [u.id, u.email, u.password_hash, u.full_name, u.role]
      );
    }
    console.log('✅ Users inserted.');
    await userConn.end();

    // 2. Seed Course DB
    console.log('--- Seeding Course DB ---');
    const courseConn = await mysql.createConnection(databases.course);
    
    const courses = [
      { id: 201, title: 'Introduction to Microservices', description: 'Learn microservices architectural patterns.', category: 'Software', price: 99.00, instructor_id: 2, status: 'published' },
      { id: 202, title: 'Advanced React with CSS Grid', description: 'Design responsive web applications.', category: 'Frontend', price: 49.00, instructor_id: 2, status: 'published' },
      { id: 203, title: 'Building Scalable T-SQL Schemas', description: 'Draft database layouts.', category: 'Database', price: 79.00, instructor_id: 2, status: 'draft' }
    ];

    for (const c of courses) {
      await courseConn.execute(
        `INSERT IGNORE INTO courses (id, title, description, category, price, instructor_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.title, c.description, c.category, c.price, c.instructor_id, c.status]
      );
    }

    const lessons = [
      { id: 301, course_id: 201, title: '1.1 Monolith vs Microservices', video_url: '/video/1_1.mp4', document_url: '' },
      { id: 302, course_id: 201, title: '1.2 Implementing API Gateways', video_url: '/video/1_2.mp4', document_url: '' },
      { id: 304, course_id: 202, title: '2.1 Flexbox vs CSS Grid Layouts', video_url: '/video/2_1.mp4', document_url: '' }
    ];

    // Ensure lesson table exists or create if needed
    await courseConn.execute(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        video_url VARCHAR(255),
        document_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const l of lessons) {
      await courseConn.execute(
        `INSERT IGNORE INTO lessons (id, course_id, title, video_url, document_url) VALUES (?, ?, ?, ?, ?)`,
        [l.id, l.course_id, l.title, l.video_url, l.document_url]
      );
    }
    
    await courseConn.execute(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        course_id INT NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Enroll student in Course 201 and 202
    await courseConn.execute(`INSERT IGNORE INTO enrollments (id, student_id, course_id, status) VALUES (1, 1, 201, 'active')`);
    await courseConn.execute(`INSERT IGNORE INTO enrollments (id, student_id, course_id, status) VALUES (2, 1, 202, 'active')`);
    
    console.log('✅ Courses, Lessons, and Enrollments inserted.');
    await courseConn.end();

    // 3. Seed Exam DB
    console.log('--- Seeding Exam DB ---');
    const examConn = await mysql.createConnection(databases.exam);

    const quizzes = [
      { id: 801, course_id: 201, title: 'Microservices Architecture Basics', time_limit_minutes: 30 }
    ];

    for (const q of quizzes) {
      await examConn.execute(
        `INSERT IGNORE INTO quizzes (Id, CourseId, Title, TimeLimitMinutes) VALUES (?, ?, ?, ?)`,
        [q.id, q.course_id, q.title, q.time_limit_minutes]
      );
    }

    const questions = [
      { id: 701, course_id: 201, topic: 'Gateway', content: 'Which service contains business logic for processing user checkout intents?', options: '["API Gateway", "Payment Service", "User Service", "Course Service"]', correct_answer: 'Payment Service' },
      { id: 702, course_id: 201, topic: 'Isolation', content: 'In database-per-service pattern, User Service is allowed to read Exam DB directly.', options: '["True", "False"]', correct_answer: 'False' },
      { id: 703, course_id: 201, topic: 'Messaging', content: 'Which protocol is typically used for asynchronous microservice communication?', options: '["HTTP REST", "AMQP (RabbitMQ)", "gRPC", "SOAP"]', correct_answer: 'AMQP (RabbitMQ)' }
    ];

    for (const q of questions) {
      await examConn.execute(
        `INSERT IGNORE INTO questions (Id, CourseId, Topic, Content, Options, CorrectAnswer) VALUES (?, ?, ?, ?, ?, ?)`,
        [q.id, q.course_id, q.topic, q.content, q.options, q.correct_answer]
      );
    }
    console.log('✅ Quizzes and Questions inserted.');
    await examConn.end();

    console.log('\n🎉 Seeding Completed Successfully!');

  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
  }
}

seedData();
