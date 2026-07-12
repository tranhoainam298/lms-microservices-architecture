import { pool } from './database.js';

export async function migrateLessonProgress() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INT NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      course_id INT NOT NULL,
      lesson_id INT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'completed',
      completed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_lesson_progress_student_course_lesson (student_id, course_id, lesson_id),
      KEY idx_lesson_progress_course (course_id),
      KEY idx_lesson_progress_lesson (lesson_id),
      CONSTRAINT fk_lesson_progress_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
      CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
