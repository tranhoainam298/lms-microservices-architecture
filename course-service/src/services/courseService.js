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

