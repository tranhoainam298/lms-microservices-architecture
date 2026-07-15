import { pool } from './database.js';

const UNIQUE_INDEX_NAME = 'uq_enrollments_student_course';

export async function migrateEnrollmentUniqueness() {
  const [duplicates] = await pool.query(
    `SELECT student_id, course_id, COUNT(*) AS duplicate_count
     FROM enrollments
     GROUP BY student_id, course_id
     HAVING COUNT(*) > 1
     LIMIT 1`
  );

  if (duplicates.length > 0) {
    const duplicate = duplicates[0];
    throw new Error(
      `Cannot add ${UNIQUE_INDEX_NAME}: duplicate enrollment rows exist for `
      + `student ${duplicate.student_id} and course ${duplicate.course_id}. `
      + 'Resolve the duplicate rows through an approved, data-preserving process before restarting Course Service.'
    );
  }

  const [indexes] = await pool.query(
    `SELECT NON_UNIQUE AS non_unique, COLUMN_NAME AS column_name
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'enrollments'
       AND INDEX_NAME = ?
     ORDER BY SEQ_IN_INDEX`,
    [UNIQUE_INDEX_NAME]
  );

  if (indexes.length > 0) {
    const columns = indexes.map((index) => index.column_name).join(',');
    const isUnique = indexes.every((index) => Number(index.non_unique) === 0);
    if (!isUnique || columns !== 'student_id,course_id') {
      throw new Error(
        `${UNIQUE_INDEX_NAME} exists with an incompatible definition. `
        + 'Review the Course DB schema through an approved, data-preserving migration.'
      );
    }
    return;
  }

  await pool.query(
    `ALTER TABLE enrollments
     ADD UNIQUE KEY uq_enrollments_student_course (student_id, course_id)`
  );
}
