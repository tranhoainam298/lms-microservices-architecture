import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'course-db-mysql',
  user: process.env.DB_USER || 'lms_course_admin',
  password: process.env.DB_PASSWORD || 'CourseSecuredPwd2026',
  database: process.env.DB_NAME || 'lms_course_db',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[DATABASE] Kết nối thành công tới database MySQL: ${process.env.DB_NAME}`);
    connection.release();
  } catch (error) {
    console.error('[DATABASE] Lỗi kết nối cơ sở dữ liệu:', error.message);
  }
}
