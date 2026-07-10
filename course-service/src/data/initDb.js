import { pool } from './database.js';

export async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS courses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  try {
    const connection = await pool.getConnection();
    await connection.query(createTableQuery);
    console.log('[DATABASE] Bảng courses đã được khởi tạo/kiểm tra thành công.');
    connection.release();
  } catch (error) {
    console.error('[DATABASE] Lỗi khi khởi tạo cơ sở dữ liệu:', error.message);
  }
}
