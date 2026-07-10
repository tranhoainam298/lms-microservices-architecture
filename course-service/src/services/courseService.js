import { pool } from '../data/database.js';

export async function createDraftCourse({ title, description, category, price, cover_image, instructorId }) {
  if (!title || !title.trim()) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Title is required.' } };
  }
  
  if (!description || !description.trim()) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Description is required.' } };
  }
  
  if (!instructorId) {
    return { status: 401, body: { code: 'UNAUTHORIZED', message: 'Missing instructor_id from token.' } };
  }

  const courseCategory = category || null;
  const coursePrice = price !== undefined ? price : 0.0;
  const courseCoverImage = cover_image || null;

  try {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO courses (title, description, category, price, cover_image, instructor_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title.trim(), description.trim(), courseCategory, coursePrice, courseCoverImage, instructorId, 'draft']
      );
      
      return {
        status: 201,
        body: { 
          message: 'Draft course created successfully', 
          courseId: result.insertId 
        }
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating course:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to create course.' } };
  }
}

export async function createLesson({ courseId, title, videoUrl, documentUrl }) {
  if (!courseId || !title || !title.trim()) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'CourseId and Title are required.' } };
  }
  
  try {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO lessons (course_id, title, video_url, document_url) VALUES (?, ?, ?, ?)',
        [courseId, title.trim(), videoUrl || null, documentUrl || null]
      );
      
      return {
        status: 201,
        body: {
          message: 'Lesson created successfully',
          lessonId: result.insertId
        }
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating lesson:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to create lesson.' } };
  }
}

export async function getLesson(lessonId, studentId) {
  if (!studentId) {
    return { status: 401, body: { code: 'UNAUTHORIZED', message: 'Missing student_id.' } };
  }

  try {
    const connection = await pool.getConnection();
    try {
      // 1. Get the lesson to find the courseId
      const [lessons] = await connection.query('SELECT * FROM lessons WHERE id = ?', [lessonId]);
      if (lessons.length === 0) {
        return { status: 404, body: { code: 'NOT_FOUND', message: 'Lesson not found.' } };
      }
      
      const lesson = lessons[0];
      
      // 2. Check enrollment
      const [enrollments] = await connection.query(
        'SELECT status FROM enrollments WHERE student_id = ? AND course_id = ?',
        [studentId, lesson.course_id]
      );
      
      if (enrollments.length === 0 || enrollments[0].status !== 'active') {
        return { status: 403, body: { code: 'FORBIDDEN', message: 'You are not actively enrolled in this course.' } };
      }
      
      return { status: 200, body: lesson };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting lesson:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to get lesson.' } };
  }
}

export async function enrollStudent(studentId, courseId) {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?',
        [studentId, courseId, 'active', 'active']
      );
      return { status: 200, body: { message: 'Student enrolled successfully' } };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error enrolling student:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to enroll student.' } };
  }
}

