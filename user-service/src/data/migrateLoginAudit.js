import { pool } from './database.js';

async function migrate() {
  console.log('[MIGRATION] Starting migration for login_audit table...');
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS login_audit (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT NULL,
        login_status VARCHAR(20) NOT NULL,
        failure_reason VARCHAR(50) NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent VARCHAR(500) NULL,
        occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_login_audit_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE SET NULL,
        INDEX idx_login_audit_user_id (user_id),
        INDEX idx_login_audit_occurred_at (occurred_at),
        INDEX idx_login_audit_status (login_status)
      );
    `;
    await pool.query(createTableQuery);
    console.log('[MIGRATION] login_audit table verified/created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION] Migration failed:', error.message);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch (err) {
      console.error('[MIGRATION] Error closing pool:', err.message);
    }
  }
}

migrate();
