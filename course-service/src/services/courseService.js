import { pool } from '../data/database.js';

export async function checkStudentExamAccess({ courseId, studentId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT c.id
       FROM courses c
       INNER JOIN enrollments e ON e.course_id = c.id
       WHERE c.id = ?
         AND c.status = 'published'
         AND e.student_id = ?
         AND e.status = 'active'
       LIMIT 1`,
      [courseId, studentId]
    );

    if (rows.length === 0) {
      return {
        status: 403,
        body: {
          code: 'COURSE_ACCESS_REQUIRED',
          message: 'You must be enrolled in a published course to access its exams.'
        }
      };
    }

    return { status: 200, body: { allowed: true, courseId } };
  } catch (error) {
    console.error('Course exam access check failed:', error.message);
    return {
      status: 500,
      body: {
        code: 'COURSE_ACCESS_CHECK_FAILED',
        message: 'Course access could not be verified.'
      }
    };
  } finally {
    if (connection) connection.release();
  }
}

export async function createDraftCourse({ title, description, category, price, cover_image, instructorId, lessons }) {
  if (typeof title !== 'string' || !title.trim()) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Title is required.' } };
  }
  if (title.trim().length > 255) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Title cannot exceed 255 characters.' } };
  }
  
  if (typeof description !== 'string' || !description.trim()) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Description is required.' } };
  }

  if (price === undefined || price === null || price === '') {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Price is required.' } };
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 99999999.99) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Price must be a valid non-negative number.' } };
  }
  
  if (!instructorId) {
    return { status: 401, body: { code: 'UNAUTHORIZED', message: 'Missing instructor_id from token.' } };
  }

  let courseCategory = null;
  if (category) {
    if (typeof category === 'string') {
      if (category.length > 255) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Category cannot exceed 255 characters.' } };
      }
      courseCategory = category.trim();
    }
  }

  let courseCoverImage = null;
  if (cover_image) {
    if (typeof cover_image === 'string') {
      if (cover_image.length > 255) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Cover image URL cannot exceed 255 characters.' } };
      }
      courseCoverImage = cover_image.trim();
    }
  }

  // Validate lessons if provided
  const validatedLessons = [];
  if (lessons !== undefined && lessons !== null) {
    if (!Array.isArray(lessons)) {
      return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Lessons must be an array.' } };
    }
    const orderIndices = new Set();
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      if (!lesson || typeof lesson !== 'object') {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: `Lesson at index ${i} is invalid.` } };
      }
      if (typeof lesson.title !== 'string' || !lesson.title.trim()) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: `Lesson at index ${i} requires a title.` } };
      }
      const cleanTitle = lesson.title.trim();
      if (cleanTitle.length > 255) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: `Lesson title at index ${i} cannot exceed 255 characters.` } };
      }

      // Check URLs
      const videoUrlVal = validateLessonUrl(lesson.videoUrl || lesson.video_url, `Lesson ${i} Video URL`);
      if (videoUrlVal.error) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: videoUrlVal.error } };
      }
      const docUrlVal = validateLessonUrl(lesson.documentUrl || lesson.document_url, `Lesson ${i} Document URL`);
      if (docUrlVal.error) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: docUrlVal.error } };
      }

      // Validate orderIndex (order_index)
      let rawOrderIndex = lesson.orderIndex !== undefined ? lesson.orderIndex : lesson.order_index;
      if (rawOrderIndex === undefined || rawOrderIndex === null) {
        rawOrderIndex = i + 1;
      }
      const numOrderIndex = Number(rawOrderIndex);
      if (!Number.isInteger(numOrderIndex) || numOrderIndex < 0) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: `Lesson order index at index ${i} must be a valid non-negative integer.` } };
      }
      if (orderIndices.has(numOrderIndex)) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: `Duplicate lesson order index ${numOrderIndex} is not allowed.` } };
      }
      orderIndices.add(numOrderIndex);

      validatedLessons.push({
        title: cleanTitle,
        videoUrl: videoUrlVal.value,
        documentUrl: docUrlVal.value,
        orderIndex: numOrderIndex
      });
    }
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [result] = await connection.query(
        'INSERT INTO courses (title, description, category, price, cover_image, instructor_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title.trim(), description.trim(), courseCategory, numericPrice, courseCoverImage, instructorId, 'draft']
      );
      const courseId = result.insertId;

      const savedLessons = [];
      for (const lesson of validatedLessons) {
        const [lessonResult] = await connection.query(
          'INSERT INTO lessons (course_id, title, video_url, document_url, order_index) VALUES (?, ?, ?, ?, ?)',
          [courseId, lesson.title, lesson.videoUrl, lesson.documentUrl, lesson.orderIndex]
        );
        savedLessons.push({
          id: lessonResult.insertId,
          courseId,
          title: lesson.title,
          videoUrl: lesson.videoUrl,
          documentUrl: lesson.documentUrl,
          orderIndex: lesson.orderIndex
        });
      }

      await connection.commit();
      
      return {
        status: 201,
        body: { 
          course: {
            id: courseId,
            title: title.trim(),
            description: description.trim(),
            category: courseCategory,
            price: numericPrice,
            cover_image: courseCoverImage,
            instructorId,
            status: 'draft',
            lessons: savedLessons
          }
        }
      };
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating course:', error);
    return { status: 500, body: { code: 'COURSE_CREATE_FAILED', message: 'The draft course could not be created.' } };
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

function validateLessonUrl(value, label) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  if (typeof value !== 'string') {
    return { error: `${label} must be a valid http or https URL.` };
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { value: null };
  }
  if (trimmedValue.length > 255) {
    return { error: `${label} cannot exceed 255 characters.` };
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { error: `${label} must use http or https.` };
    }
  } catch {
    return { error: `${label} must be a valid http or https URL.` };
  }

  return { value: trimmedValue };
}

function validateLessonInput({ title, videoUrl, documentUrl }) {
  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  const cleanTitle = title.trim();
  if (cleanTitle.length > 255) {
    return { error: 'Title cannot exceed 255 characters.' };
  }

  const videoUrlValidation = validateLessonUrl(videoUrl, 'Video URL');
  if (videoUrlValidation.error) {
    return { error: videoUrlValidation.error };
  }

  const documentUrlValidation = validateLessonUrl(documentUrl, 'Document URL');
  if (documentUrlValidation.error) {
    return { error: documentUrlValidation.error };
  }

  if (!videoUrlValidation.value && !documentUrlValidation.value) {
    return { error: 'Provide a video URL or document URL.' };
  }

  return {
    value: {
      cleanTitle,
      videoUrl: videoUrlValidation.value,
      documentUrl: documentUrlValidation.value
    }
  };
}

function toLessonResponse(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    videoUrl: row.video_url,
    documentUrl: row.document_url,
    sequenceOrder: row.order_index,
    createdAt: row.created_at
  };
}

export async function createLessonForInstructorDraft({
  courseId,
  instructorId,
  title,
  videoUrl,
  documentUrl
}) {
  const lessonValidation = validateLessonInput({ title, videoUrl, documentUrl });
  if (lessonValidation.error) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: lessonValidation.error } };
  }
  const lessonInput = lessonValidation.value;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [draftRows] = await connection.query(
      `SELECT id
       FROM courses
       WHERE id = ? AND instructor_id = ? AND status = 'draft'
       FOR UPDATE`,
      [courseId, instructorId]
    );

    if (draftRows.length === 0) {
      await connection.rollback();
      return {
        status: 404,
        body: { code: 'DRAFT_NOT_FOUND', message: 'The draft course was not found.' }
      };
    }

    const [orderRows] = await connection.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 AS nextOrder FROM lessons WHERE course_id = ? FOR UPDATE',
      [courseId]
    );
    const sequenceOrder = orderRows[0].nextOrder;

    const [insertResult] = await connection.query(
      `INSERT INTO lessons (course_id, title, video_url, document_url, order_index)
       SELECT id, ?, ?, ?, ?
       FROM courses
       WHERE id = ? AND instructor_id = ? AND status = 'draft'`,
      [
        lessonInput.cleanTitle,
        lessonInput.videoUrl,
        lessonInput.documentUrl,
        sequenceOrder,
        courseId,
        instructorId
      ]
    );

    if (insertResult.affectedRows === 0) {
      await connection.rollback();
      return {
        status: 404,
        body: { code: 'DRAFT_NOT_FOUND', message: 'The draft course was not found.' }
      };
    }

    const [lessonRows] = await connection.query(
      `SELECT id, course_id, title, video_url, document_url, order_index, created_at
       FROM lessons
       WHERE id = ?`,
      [insertResult.insertId]
    );

    await connection.commit();
    const lesson = lessonRows[0];
    return {
      status: 201,
      body: {
        lesson: toLessonResponse(lesson)
      }
    };
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // The transaction may already be complete.
      }
    }
    console.error('Lesson creation failed:', error.message);
    return {
      status: 500,
      body: { code: 'LESSON_CREATE_FAILED', message: 'The lesson could not be created.' }
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function getLessonsForInstructorDraft({ courseId, instructorId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [draftRows] = await connection.query(
      `SELECT id
       FROM courses
       WHERE id = ? AND instructor_id = ? AND status = 'draft'`,
      [courseId, instructorId]
    );
    if (draftRows.length === 0) {
      return {
        status: 404,
        body: { code: 'DRAFT_NOT_FOUND', message: 'The draft course was not found.' }
      };
    }

    const [lessonRows] = await connection.query(
      `SELECT l.id, l.course_id, l.title, l.video_url, l.document_url, l.order_index, l.created_at
       FROM lessons l
       INNER JOIN courses c ON c.id = l.course_id
       WHERE c.id = ? AND c.instructor_id = ? AND c.status = 'draft'
       ORDER BY l.order_index ASC, l.id ASC`,
      [courseId, instructorId]
    );

    const items = lessonRows.map(toLessonResponse);
    return { status: 200, body: { items, total: items.length } };
  } catch (error) {
    console.error('Lesson listing failed:', error.message);
    return {
      status: 500,
      body: { code: 'LESSON_LIST_FAILED', message: 'The lessons could not be loaded.' }
    };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateLessonForInstructorDraft({
  courseId,
  lessonId,
  instructorId,
  title,
  videoUrl,
  documentUrl
}) {
  const lessonValidation = validateLessonInput({ title, videoUrl, documentUrl });
  if (lessonValidation.error) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: lessonValidation.error } };
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [updateResult] = await connection.query(
      `UPDATE lessons l
       INNER JOIN courses c ON c.id = l.course_id
       SET l.title = ?, l.video_url = ?, l.document_url = ?
       WHERE l.id = ? AND l.course_id = ? AND c.instructor_id = ? AND c.status = 'draft'`,
      [
        lessonValidation.value.cleanTitle,
        lessonValidation.value.videoUrl,
        lessonValidation.value.documentUrl,
        lessonId,
        courseId,
        instructorId
      ]
    );
    if (updateResult.affectedRows === 0) {
      return {
        status: 404,
        body: { code: 'LESSON_NOT_FOUND', message: 'The lesson was not found.' }
      };
    }

    const [lessonRows] = await connection.query(
      `SELECT id, course_id, title, video_url, document_url, order_index, created_at
       FROM lessons
       WHERE id = ? AND course_id = ?`,
      [lessonId, courseId]
    );
    return { status: 200, body: { lesson: toLessonResponse(lessonRows[0]) } };
  } catch (error) {
    console.error('Lesson update failed:', error.message);
    return {
      status: 500,
      body: { code: 'LESSON_UPDATE_FAILED', message: 'The lesson could not be updated.' }
    };
  } finally {
    if (connection) connection.release();
  }
}

export async function deleteLessonForInstructorDraft({ courseId, lessonId, instructorId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [deleteResult] = await connection.query(
      `DELETE l
       FROM lessons l
       INNER JOIN courses c ON c.id = l.course_id
       WHERE l.id = ? AND l.course_id = ? AND c.instructor_id = ? AND c.status = 'draft'`,
      [lessonId, courseId, instructorId]
    );
    if (deleteResult.affectedRows === 0) {
      return {
        status: 404,
        body: { code: 'LESSON_NOT_FOUND', message: 'The lesson was not found.' }
      };
    }
    return { status: 200, body: { deleted: true, lessonId } };
  } catch (error) {
    console.error('Lesson deletion failed:', error.message);
    return {
      status: 500,
      body: { code: 'LESSON_DELETE_FAILED', message: 'The lesson could not be deleted.' }
    };
  } finally {
    if (connection) connection.release();
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
      const [lessons] = await connection.query(
        `SELECT l.id, l.course_id, l.title, l.video_url, l.document_url, l.order_index, l.created_at
         FROM lessons l
         INNER JOIN courses c ON c.id = l.course_id
         WHERE l.id = ? AND c.status = 'published'
         LIMIT 1`,
        [lessonId]
      );
      if (lessons.length === 0) {
        return { status: 404, body: { code: 'LESSON_NOT_FOUND', message: 'The lesson was not found.' } };
      }
      
      const lesson = lessons[0];
      
      // 2. Check enrollment
      const [enrollments] = await connection.query(
        `SELECT status FROM enrollments
         WHERE student_id = ? AND course_id = ? AND status = 'active'
         ORDER BY id ASC LIMIT 1`,
        [studentId, lesson.course_id]
      );
      
      if (enrollments.length === 0 || enrollments[0].status !== 'active') {
        return { status: 403, body: { code: 'COURSE_ACCESS_REQUIRED', message: 'Enroll to unlock this lesson.' } };
      }

      return { status: 200, body: { lesson: toLessonResponse(lesson) } };
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

export async function getCourseTitlesInternal() {
  try {
    const connection = await pool.getConnection();
    try {
      const [courses] = await connection.query(
        'SELECT id, title, price, status, instructor_id FROM courses'
      );
      const courseMap = {};
      for (const course of courses) {
        courseMap[course.id] = {
          title: course.title,
          price: Number(course.price),
          status: course.status,
          instructorId: course.instructor_id
        };
      }
      return { status: 200, body: { courses: courseMap } };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting course titles:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to get course titles.' } };
  }
}

export async function getCourses() {
  try {
    const connection = await pool.getConnection();
    try {
      const [courses] = await connection.query('SELECT * FROM courses');
      return { status: 200, body: courses };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting courses:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to get courses.' } };
  }
}

export async function getEnrolledCourses(studentId) {
  if (!studentId) {
    return { status: 401, body: { code: 'UNAUTHORIZED', message: 'Missing student_id.' } };
  }
  try {
    const connection = await pool.getConnection();
    try {
      const [courses] = await connection.query(
        `SELECT c.*, e.progress_percent FROM courses c
         JOIN enrollments e ON c.id = e.course_id 
         WHERE e.student_id = ? AND e.status = 'active'`,
        [studentId]
      );
      return { status: 200, body: courses };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting enrolled courses:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to get enrolled courses.' } };
  }
}

export async function getInstructorDrafts(instructorId) {
  if (!instructorId) {
    return { status: 401, body: { code: 'UNAUTHORIZED', message: 'Missing instructorId.' } };
  }
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT id, title, description, price, status, instructor_id, created_at, updated_at
         FROM courses
         WHERE instructor_id = ? AND status = 'draft'
         ORDER BY created_at DESC, id DESC`,
        [instructorId]
      );

      const items = rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        price: Number(row.price),
        status: row.status,
        instructorId: row.instructor_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        status: 200,
        body: {
          items,
          total: items.length
        }
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting instructor drafts:', error);
    return {
      status: 500,
      body: {
        code: 'COURSE_DRAFT_LIST_FAILED',
        message: 'Course drafts could not be loaded.'
      }
    };
  }
}

export async function updateInstructorDraft({
  courseId,
  instructorId,
  title,
  description,
  price
}) {
  // Title validation
  if (typeof title !== 'string' || title.trim() === '') {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Title is required and cannot be empty.' } };
  }
  const cleanTitle = title.trim();
  if (cleanTitle.length > 255) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Title cannot exceed 255 characters.' } };
  }

  // Description validation
  if (typeof description !== 'string' || description.trim() === '') {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Description is required and cannot be empty.' } };
  }
  const cleanDescription = description.trim();

  // Price validation
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || parsedPrice > 99999999.99) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Price must be a non-negative finite number and within decimal range.' } };
  }

  try {
    const connection = await pool.getConnection();
    try {
      const [updateResult] = await connection.query(
        `UPDATE courses
         SET
           title = ?,
           description = ?,
           price = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE
           id = ?
           AND instructor_id = ?
           AND status = 'draft'`,
        [cleanTitle, cleanDescription, parsedPrice, courseId, instructorId]
      );

      if (updateResult.affectedRows === 0) {
        return {
          status: 404,
          body: {
            code: 'DRAFT_NOT_FOUND',
            message: 'The draft course was not found.'
          }
        };
      }

      // Fetch the updated row to return it
      const [rows] = await connection.query(
        `SELECT id, title, description, price, status, instructor_id, created_at, updated_at
         FROM courses
         WHERE id = ?`,
        [courseId]
      );

      const updatedRow = rows[0];
      return {
        status: 200,
        body: {
          course: {
            id: updatedRow.id,
            title: updatedRow.title,
            description: updatedRow.description,
            price: Number(updatedRow.price),
            status: updatedRow.status,
            instructorId: updatedRow.instructor_id,
            createdAt: updatedRow.created_at,
            updatedAt: updatedRow.updated_at
          }
        }
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating instructor draft:', error);
    return {
      status: 500,
      body: {
        code: 'COURSE_DRAFT_UPDATE_FAILED',
        message: 'The draft course could not be updated.'
      }
    };
  }
}

export async function getStudentCourseLearning({ courseId, studentId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [courseRows] = await connection.query(
      `SELECT c.id, c.title, c.description, c.price, c.status, e.progress_percent
       FROM courses c
       INNER JOIN enrollments e ON e.course_id = c.id
       WHERE c.id = ? AND c.status = 'published' AND e.student_id = ? AND e.status = 'active'
       ORDER BY e.id ASC LIMIT 1`,
      [courseId, studentId]
    );
    if (courseRows.length === 0) {
      return { status: 403, body: { code: 'COURSE_ACCESS_REQUIRED', message: 'Enroll to unlock this lesson.' } };
    }

    const [lessonRows] = await connection.query(
      `SELECT id, course_id, title, video_url, document_url, order_index, created_at
       FROM lessons WHERE course_id = ? ORDER BY order_index ASC, id ASC`,
      [courseId]
    );
    const [progressRows] = await connection.query(
      `SELECT lesson_id, status, completed_at
       FROM lesson_progress
       WHERE student_id = ? AND course_id = ? AND status = 'completed'
       ORDER BY lesson_id ASC`,
      [studentId, courseId]
    );
    const completedLessonIds = progressRows.map(row => row.lesson_id);
    const totalLessons = lessonRows.length;
    const completedLessons = completedLessonIds.length;
    const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    return {
      status: 200,
      body: {
        course: {
          id: courseRows[0].id,
          title: courseRows[0].title,
          description: courseRows[0].description,
          price: Number(courseRows[0].price),
          status: courseRows[0].status
        },
        items: lessonRows.map(toLessonResponse),
        completedLessonIds,
        progress: { completedLessons, totalLessons, percent: progressPercent }
      }
    };
  } catch (error) {
    console.error('Failed to load course learning data:', error.message);
    return { status: 500, body: { code: 'LEARNING_LOAD_FAILED', message: 'Course content could not be loaded.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function completeStudentLesson({ lessonId, studentId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [lessonRows] = await connection.query(
      `SELECT l.id, l.course_id
       FROM lessons l
       INNER JOIN courses c ON c.id = l.course_id
       INNER JOIN enrollments e ON e.course_id = c.id
       WHERE l.id = ? AND c.status = 'published' AND e.student_id = ? AND e.status = 'active'
       ORDER BY e.id ASC LIMIT 1 FOR UPDATE`,
      [lessonId, studentId]
    );
    if (lessonRows.length === 0) {
      await connection.rollback();
      return { status: 403, body: { code: 'COURSE_ACCESS_REQUIRED', message: 'Enroll to unlock this lesson.' } };
    }

    const courseId = lessonRows[0].course_id;
    await connection.query(
      `INSERT INTO lesson_progress (student_id, course_id, lesson_id, status, completed_at)
       VALUES (?, ?, ?, 'completed', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE status = 'completed', completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)`,
      [studentId, courseId, lessonId]
    );
    const [[counts]] = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM lessons WHERE course_id = ?) AS total_lessons,
         (SELECT COUNT(*) FROM lesson_progress WHERE student_id = ? AND course_id = ? AND status = 'completed') AS completed_lessons`,
      [courseId, studentId, courseId]
    );
    const totalLessons = Number(counts.total_lessons);
    const completedLessons = Number(counts.completed_lessons);
    const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    await connection.query(
      `UPDATE enrollments SET progress_percent = ?
       WHERE student_id = ? AND course_id = ? AND status = 'active'`,
      [progressPercent, studentId, courseId]
    );
    const [completedRows] = await connection.query(
      `SELECT lesson_id FROM lesson_progress
       WHERE student_id = ? AND course_id = ? AND status = 'completed'
       ORDER BY lesson_id ASC`,
      [studentId, courseId]
    );
    await connection.commit();
    return {
      status: 200,
      body: {
        completed: true,
        lessonId,
        courseId,
        completedLessonIds: completedRows.map(row => row.lesson_id),
        progress: { completedLessons, totalLessons, percent: progressPercent }
      }
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to complete lesson:', error.message);
    return { status: 500, body: { code: 'LESSON_COMPLETE_FAILED', message: 'Learning progress could not be saved.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function askAiAboutLesson({ lessonId, studentId, question }) {
  const cleanQuestion = typeof question === 'string' ? question.trim() : '';
  if (!cleanQuestion || cleanQuestion.length > 1000) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Question must contain between 1 and 1000 characters.' } };
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [lessonRows] = await connection.query(
      `SELECT l.id, l.course_id, l.title, l.video_url, l.document_url,
              c.title AS course_title, c.description AS course_description, c.status AS course_status
       FROM lessons l
       INNER JOIN courses c ON c.id = l.course_id
       WHERE l.id = ?
       LIMIT 1`,
      [lessonId]
    );
    if (lessonRows.length === 0) {
      return { status: 404, body: { code: 'LESSON_NOT_FOUND', message: 'The lesson was not found.' } };
    }

    const lesson = lessonRows[0];
    const [enrollmentRows] = await connection.query(
      `SELECT progress_percent
       FROM enrollments
       WHERE student_id = ? AND course_id = ? AND status = 'active'
       ORDER BY id ASC LIMIT 1`,
      [studentId, lesson.course_id]
    );
    if (lesson.course_status !== 'published' || enrollmentRows.length === 0) {
      return { status: 403, body: { code: 'COURSE_ACCESS_REQUIRED', message: 'Enroll to unlock AI support.' } };
    }

    const resources = [];
    if (lesson.video_url) resources.push({ type: 'video', url: lesson.video_url });
    if (lesson.document_url) resources.push({ type: 'document', url: lesson.document_url });
    const context = {
      courseTitle: lesson.course_title,
      courseDescription: lesson.course_description || '',
      lessonTitle: lesson.title,
      lessonContent: resources.length > 0 ? 'Use the lesson title, course description, and attached resources as the available learning context.' : '',
      lessonResources: resources,
      progressPercent: Number(enrollmentRows[0].progress_percent || 0)
    };

    const aiChatbotUrl = (process.env.AI_CHATBOT_URL || process.env.EXTERNAL_AI_CHATBOT_URL || '').replace(/\/+$/, '');
    if (!aiChatbotUrl) {
      return { status: 502, body: { code: 'AI_SUPPORT_UNAVAILABLE', message: 'AI support is unavailable right now.' } };
    }

    let response;
    try {
      response = await fetch(`${aiChatbotUrl}/chat`, {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleanQuestion, context })
      });
    } catch (error) {
      return { status: 502, body: { code: 'AI_SUPPORT_UNAVAILABLE', message: 'AI support is unavailable right now.' } };
    }

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      if (responseBody?.code === 'AI_PROVIDER_NOT_CONFIGURED') {
        return { status: 503, body: { code: responseBody.code, message: responseBody.message } };
      }
      if (responseBody?.code === 'AI_PROVIDER_UNAVAILABLE' || responseBody?.code === 'AI_PROVIDER_RESPONSE_INVALID') {
        return { status: 502, body: { code: responseBody.code, message: responseBody.message } };
      }
      return { status: 502, body: { code: 'AI_SUPPORT_UNAVAILABLE', message: 'AI support is unavailable right now.' } };
    }
    if (typeof responseBody?.answer !== 'string' || !responseBody.answer.trim()) {
      return { status: 502, body: { code: 'AI_RESPONSE_INVALID', message: 'AI support returned an invalid response.' } };
    }

    return {
      status: 200,
      body: {
        answer: responseBody.answer.trim(),
        model: responseBody.model || null,
        provider: responseBody.provider || null,
        usage: responseBody.usage || { inputTokens: null, outputTokens: null }
      }
    };
  } catch (error) {
    console.error('Failed to prepare AI lesson context:', error.message);
    return { status: 500, body: { code: 'AI_CONTEXT_LOAD_FAILED', message: 'Lesson context could not be loaded.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function getPurchasableCourse(courseId) {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, price, status
       FROM courses
       WHERE id = ? AND status = 'published'
       LIMIT 1`,
      [courseId]
    );
    if (rows.length === 0) {
      return { status: 404, body: { code: 'COURSE_NOT_AVAILABLE', message: 'The course is not available for purchase.' } };
    }
    const course = rows[0];
    return {
      status: 200,
      body: { course: { id: course.id, title: course.title, price: Number(course.price), status: course.status } }
    };
  } catch (error) {
    console.error('Failed to load purchasable course:', error.message);
    return { status: 500, body: { code: 'COURSE_LOOKUP_FAILED', message: 'The course could not be verified.' } };
  }
}

export async function activateEnrollment({ studentId, courseId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [courses] = await connection.query(
      `SELECT id FROM courses WHERE id = ? AND status = 'published' FOR UPDATE`,
      [courseId]
    );
    if (courses.length === 0) {
      await connection.rollback();
      return { status: 404, body: { code: 'COURSE_NOT_AVAILABLE', message: 'The course is not available for enrollment.' } };
    }

    const [existing] = await connection.query(
      `SELECT id FROM enrollments
       WHERE student_id = ? AND course_id = ?
       ORDER BY id ASC LIMIT 1 FOR UPDATE`,
      [studentId, courseId]
    );
    let enrollmentId;
    if (existing.length > 0) {
      enrollmentId = existing[0].id;
      await connection.query(
        `UPDATE enrollments SET status = 'active' WHERE student_id = ? AND course_id = ?`,
        [studentId, courseId]
      );
    } else {
      const [insertResult] = await connection.query(
        `INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'active')`,
        [studentId, courseId]
      );
      enrollmentId = insertResult.insertId;
    }
    await connection.commit();
    return {
      status: 200,
      body: { enrollment: { id: enrollmentId, studentId, courseId, status: 'active' } }
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to activate enrollment:', error.message);
    return { status: 500, body: { code: 'ENROLLMENT_ACTIVATION_FAILED', message: 'Course access could not be activated.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function publishInstructorDraft({ courseId, instructorId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [draftRows] = await connection.query(
      `SELECT id, title, description, price, status, instructor_id, created_at, updated_at
       FROM courses
       WHERE id = ? AND instructor_id = ? AND status = 'draft'
       FOR UPDATE`,
      [courseId, instructorId]
    );

    if (draftRows.length === 0) {
      await connection.rollback();
      return {
        status: 404,
        body: { code: 'DRAFT_NOT_FOUND', message: 'The draft course was not found.' }
      };
    }

    const draft = draftRows[0];
    if (typeof draft.title !== 'string' || !draft.title.trim() || draft.title.length > 255
      || typeof draft.description !== 'string' || !draft.description.trim()) {
      await connection.rollback();
      return {
        status: 409,
        body: {
          code: 'COURSE_NOT_READY',
          message: 'Complete the required course details before publishing the course.'
        }
      };
    }

    const [lessonCountRows] = await connection.query(
      'SELECT COUNT(*) AS lesson_count FROM lessons WHERE course_id = ?',
      [courseId]
    );

    if (lessonCountRows[0].lesson_count === 0) {
      await connection.rollback();
      return {
        status: 409,
        body: {
          code: 'COURSE_NOT_READY',
          message: 'Add at least one lesson before publishing the course.'
        }
      };
    }

    const [updateResult] = await connection.query(
      `UPDATE courses
       SET status = 'published', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND instructor_id = ? AND status = 'draft'`,
      [courseId, instructorId]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return {
        status: 404,
        body: { code: 'DRAFT_NOT_FOUND', message: 'The draft course was not found.' }
      };
    }

    const [publishedRows] = await connection.query(
      `SELECT id, title, description, price, status, instructor_id, created_at, updated_at
       FROM courses
       WHERE id = ?`,
      [courseId]
    );

    await connection.commit();
    const publishedCourse = publishedRows[0];
    return {
      status: 200,
      body: {
        course: {
          id: publishedCourse.id,
          title: publishedCourse.title,
          description: publishedCourse.description,
          price: Number(publishedCourse.price),
          status: publishedCourse.status,
          instructorId: publishedCourse.instructor_id,
          createdAt: publishedCourse.created_at,
          updatedAt: publishedCourse.updated_at
        }
      }
    };
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // The transaction may already be complete.
      }
    }
    console.error('Course publishing failed:', error.message);
    return {
      status: 500,
      body: { code: 'COURSE_PUBLISH_FAILED', message: 'The course could not be published.' }
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

