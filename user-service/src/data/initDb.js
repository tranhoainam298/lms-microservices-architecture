import { pool } from './database.js';

export async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'student',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  try {
    const connection = await pool.getConnection();
    await connection.query(createTableQuery);
    console.log('[DATABASE] Bảng users đã được khởi tạo/kiểm tra thành công.');
    connection.release();
  } catch (error) {
    console.error('[DATABASE] Lỗi khi khởi tạo cơ sở dữ liệu:', error.message);
  }
}
