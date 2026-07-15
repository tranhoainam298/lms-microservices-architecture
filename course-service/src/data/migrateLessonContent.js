import { pool } from './database.js';

export async function migrateLessonContent() {
  const [rows] = await pool.query(
    `SELECT DATA_TYPE AS data_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'lessons'
       AND COLUMN_NAME = 'content'
     LIMIT 1`
  );
  if (rows.length === 0) {
    await pool.query('ALTER TABLE lessons ADD COLUMN content LONGTEXT NULL AFTER title');
  } else if (String(rows[0].data_type).toLowerCase() !== 'longtext') {
    // Widen legacy text columns without changing or deleting stored lesson data.
    await pool.query('ALTER TABLE lessons MODIFY COLUMN content LONGTEXT NULL');
  }
}
