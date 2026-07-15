import { pool } from './database.js';

export async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'student',
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(createTableQuery);
    console.log('[DATABASE] User schema is ready.');
  } catch (error) {
    console.error('[DATABASE] User schema initialization failed:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}
