import 'dotenv/config';
import { pool } from './database.js';

async function migrateUserStatus() {
  let connection;
  try {
    connection = await pool.getConnection();
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'`
    );

    if (columns.length === 0) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER role"
      );
      console.log('Added users.status with active as the default.');
    } else {
      console.log('users.status already exists; no migration was needed.');
    }
  } catch (error) {
    console.error('User status migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

migrateUserStatus();
