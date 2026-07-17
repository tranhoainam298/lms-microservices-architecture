import { pool } from './database.js';

/**
 * Ensures the enrollments table has a UNIQUE constraint on (student_id, course_id).
 *
 * Steps:
 *  1. Check if the unique index already exists (idempotent).
 *  2. Remove duplicate rows, keeping the enrollment with the lowest id per (student_id, course_id).
 *  3. Add the UNIQUE constraint.
 */
export async function migrateEnrollmentUniqueness() {
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Check if the unique index already exists
    const [indexes] = await connection.query(
      `SELECT INDEX_NAME
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'enrollments'
         AND INDEX_NAME = 'uq_enrollment_student_course'
       LIMIT 1`
    );

    if (indexes.length > 0) {
      // Constraint already exists, nothing to do
      return;
    }

    // 2. Remove duplicate enrollments, keeping the one with the lowest id
    await connection.beginTransaction();
    try {
      await connection.query(
        `DELETE e1
         FROM enrollments e1
         INNER JOIN enrollments e2
           ON e1.student_id = e2.student_id
          AND e1.course_id = e2.course_id
          AND e1.id > e2.id`
      );

      // 3. Add the UNIQUE constraint
      await connection.query(
        `ALTER TABLE enrollments
         ADD UNIQUE KEY uq_enrollment_student_course (student_id, course_id)`
      );

      await connection.commit();
      console.log('[MIGRATION] Enrollment uniqueness constraint applied successfully.');
    } catch (txError) {
      await connection.rollback();
      throw txError;
    }
  } finally {
    if (connection) connection.release();
  }
}
