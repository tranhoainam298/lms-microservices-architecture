import { pool } from '../data/database.js';
import { publishCourseAccessActivated } from '../data/courseEventPublisher.js';

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

  const coverImageValidation = validateLessonUrl(cover_image, 'Cover image URL');
  if (coverImageValidation.error) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: coverImageValidation.error } };
  }
  const courseCoverImage = coverImageValidation.value;

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
      if (lesson.content !== undefined && lesson.content !== null && typeof lesson.content !== 'string') {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: `Lesson content at index ${i} must be text.` } };
      }
      const content = typeof lesson.content === 'string' ? lesson.content.trim() : '';
      if (content.length > 50000) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: `Lesson content at index ${i} cannot exceed 50000 characters.` } };
      }
      if (!videoUrlVal.value && !docUrlVal.value && !content) {
        return { status: 400, body: { code: 'VALIDATION_ERROR', message: `Lesson at index ${i} requires content or a resource URL.` } };
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
        content: content || null,
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
          'INSERT INTO lessons (course_id, title, content, video_url, document_url, order_index) VALUES (?, ?, ?, ?, ?, ?)',
          [courseId, lesson.title, lesson.content, lesson.videoUrl, lesson.documentUrl, lesson.orderIndex]
        );
        savedLessons.push({
          id: lessonResult.insertId,
          courseId,
          title: lesson.title,
          content: lesson.content,
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

function validateLessonInput({ title, content, videoUrl, documentUrl }) {
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

  if (content !== undefined && content !== null && typeof content !== 'string') {
    return { error: 'Lesson content must be text.' };
  }
  const cleanContent = typeof content === 'string' ? content.trim() : '';
  if (cleanContent.length > 50000) {
    return { error: 'Lesson content cannot exceed 50000 characters.' };
  }

  if (!videoUrlValidation.value && !documentUrlValidation.value && !cleanContent) {
    return { error: 'Provide lesson content, a video URL, or a document URL.' };
  }

  return {
    value: {
      cleanTitle,
      content: cleanContent || null,
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
    content: row.content,
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
  content,
  videoUrl,
  documentUrl
}) {
  const lessonValidation = validateLessonInput({ title, content, videoUrl, documentUrl });
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
      `INSERT INTO lessons (course_id, title, content, video_url, document_url, order_index)
       SELECT id, ?, ?, ?, ?, ?
       FROM courses
       WHERE id = ? AND instructor_id = ? AND status = 'draft'`,
      [
        lessonInput.cleanTitle,
        lessonInput.content,
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
      `SELECT id, course_id, title, content, video_url, document_url, order_index, created_at
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
      `SELECT l.id, l.course_id, l.title, l.content, l.video_url, l.document_url, l.order_index, l.created_at
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
  content,
  videoUrl,
  documentUrl
}) {
  const lessonValidation = validateLessonInput({ title, content, videoUrl, documentUrl });
  if (lessonValidation.error) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: lessonValidation.error } };
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [updateResult] = await connection.query(
      `UPDATE lessons l
       INNER JOIN courses c ON c.id = l.course_id
       SET l.title = ?, l.content = ?, l.video_url = ?, l.document_url = ?
       WHERE l.id = ? AND l.course_id = ? AND c.instructor_id = ? AND c.status = 'draft'`,
      [
        lessonValidation.value.cleanTitle,
        lessonValidation.value.content,
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
      `SELECT id, course_id, title, content, video_url, document_url, order_index, created_at
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
        `SELECT l.id, l.course_id, l.title, l.content, l.video_url, l.document_url, l.order_index, l.created_at
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

function parseInternalCourseIds(value) {
  if (value === undefined || value === null || value === '') return [];
  const rawIds = String(value).split(',');
  if (rawIds.length > 500) return null;

  const ids = [];
  for (const rawId of rawIds) {
    const text = rawId.trim();
    const id = Number(text);
    if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(id)) return null;
    ids.push(id);
  }
  return [...new Set(ids)];
}

export async function getCourseTitlesInternal(courseIdsValue) {
  const courseIds = parseInternalCourseIds(courseIdsValue);
  if (courseIds === null) {
    return { status: 400, body: { code: 'INVALID_COURSE_IDS', message: 'Course IDs must be positive integers.' } };
  }
  if (courseIds.length === 0) {
    return { status: 200, body: { courses: {} } };
  }

  try {
    const connection = await pool.getConnection();
    try {
      const placeholders = courseIds.map(() => '?').join(', ');
      const [courses] = await connection.query(
        `SELECT id, title, price, status FROM courses WHERE id IN (${placeholders})`,
        courseIds
      );
      const courseMap = {};
      for (const course of courses) {
        courseMap[course.id] = {
          id: course.id,
          title: course.title,
          price: Number(course.price),
          status: course.status
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

const COURSE_STATUSES = new Set(['draft', 'pending_review', 'published', 'rejected']);

function validateOptionalText(value, { field, maxLength }) {
  if (value === undefined) return { value: null };
  if (typeof value !== 'string') {
    return { error: `${field} must be a string.` };
  }
  const cleaned = value.trim();
  if (!cleaned) return { error: `${field} cannot be empty.` };
  if (cleaned.length > maxLength) {
    return { error: `${field} cannot exceed ${maxLength} characters.` };
  }
  return { value: cleaned };
}

export async function reorderLessonsForInstructorDraft({ courseId, instructorId, lessonIds }) {
  if (!Array.isArray(lessonIds)) {
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'lessonIds must be an array.' }
    };
  }
  if (lessonIds.length > 500) {
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'A course cannot reorder more than 500 lessons at once.' }
    };
  }

  const normalizedIds = lessonIds.map(value => Number(value));
  if (normalizedIds.some((value, index) => !Number.isSafeInteger(value)
    || value <= 0
    || !/^[1-9]\d*$/.test(String(lessonIds[index])))) {
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Every lesson ID must be a positive integer.' }
    };
  }
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Lesson IDs must not contain duplicates.' }
    };
  }

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

    const [currentRows] = await connection.query(
      `SELECT id
       FROM lessons
       WHERE course_id = ?
       ORDER BY order_index ASC, id ASC
       FOR UPDATE`,
      [courseId]
    );
    const currentIds = currentRows.map(row => Number(row.id));
    const requestedSet = new Set(normalizedIds);
    if (currentIds.length !== normalizedIds.length || currentIds.some(id => !requestedSet.has(id))) {
      await connection.rollback();
      return {
        status: 400,
        body: {
          code: 'LESSON_ORDER_MISMATCH',
          message: 'lessonIds must contain every lesson in this draft exactly once.'
        }
      };
    }

    // Use a temporary negative range first so this remains safe if the schema has
    // a unique course/order index. The final order is always server-generated 1..N.
    for (let index = 0; index < normalizedIds.length; index += 1) {
      await connection.query(
        'UPDATE lessons SET order_index = ? WHERE id = ? AND course_id = ?',
        [-(index + 1), normalizedIds[index], courseId]
      );
    }
    for (let index = 0; index < normalizedIds.length; index += 1) {
      await connection.query(
        'UPDATE lessons SET order_index = ? WHERE id = ? AND course_id = ?',
        [index + 1, normalizedIds[index], courseId]
      );
    }

    const [orderedRows] = await connection.query(
      `SELECT id, course_id, title, content, video_url, document_url, order_index, created_at
       FROM lessons
       WHERE course_id = ?
       ORDER BY order_index ASC, id ASC`,
      [courseId]
    );
    await connection.commit();
    const items = orderedRows.map(toLessonResponse);
    return { status: 200, body: { items, total: items.length } };
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // The transaction may already be complete.
      }
    }
    console.error('Lesson reorder failed:', error.message);
    return {
      status: 500,
      body: { code: 'LESSON_REORDER_FAILED', message: 'The lesson order could not be saved.' }
    };
  } finally {
    if (connection) connection.release();
  }
}

export async function checkInstructorCourseAccess({ courseId, instructorId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id
       FROM courses
       WHERE id = ? AND instructor_id = ? AND status <> 'deleted'
       LIMIT 1`,
      [courseId, instructorId]
    );
    if (rows.length === 0) {
      return { status: 404, body: { code: 'COURSE_NOT_FOUND', message: 'The course was not found.' } };
    }
    return { status: 200, body: { allowed: true, courseId } };
  } catch (error) {
    console.error('Instructor course access check failed:', error.message);
    return { status: 500, body: { code: 'COURSE_ACCESS_CHECK_FAILED', message: 'Course access could not be verified.' } };
  } finally {
    if (connection) connection.release();
  }
}

function validateOptionalPrice(value, field) {
  if (value === undefined) return { value: null };
  if (typeof value !== 'string' && typeof value !== 'number') {
    return { error: `${field} must be a valid non-negative number.` };
  }
  const text = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) {
    return { error: `${field} must be a valid non-negative number with at most two decimal places.` };
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed > 99999999.99) {
    return { error: `${field} is outside the supported price range.` };
  }
  return { value: parsed };
}

function validateOptionalDate(value, field) {
  if (value === undefined) return { value: null };
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: `${field} must use YYYY-MM-DD format.` };
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: `${field} must be a valid calendar date.` };
  }
  return { value };
}

function validateCatalogFilters(filters = {}) {
  const search = validateOptionalText(filters.search, { field: 'Search', maxLength: 100 });
  if (search.error) return search;
  const category = validateOptionalText(filters.category, { field: 'Category', maxLength: 255 });
  if (category.error) return category;
  const minPrice = validateOptionalPrice(filters.minPrice, 'Minimum price');
  if (minPrice.error) return minPrice;
  const maxPrice = validateOptionalPrice(filters.maxPrice, 'Maximum price');
  if (maxPrice.error) return maxPrice;
  if (minPrice.value !== null && maxPrice.value !== null && minPrice.value > maxPrice.value) {
    return { error: 'Minimum price cannot be greater than maximum price.' };
  }
  return {
    value: {
      search: search.value,
      category: category.value,
      minPrice: minPrice.value,
      maxPrice: maxPrice.value
    }
  };
}

export async function getCourses(filters = {}) {
  const validation = validateCatalogFilters(filters);
  if (validation.error) {
    return { status: 400, body: { code: 'INVALID_COURSE_FILTER', message: validation.error } };
  }

  const clauses = ["status = 'published'"];
  const parameters = [];
  const { search, category, minPrice, maxPrice } = validation.value;
  if (search) {
    clauses.push('(title LIKE ? OR description LIKE ?)');
    parameters.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    clauses.push('category = ?');
    parameters.push(category);
  }
  if (minPrice !== null) {
    clauses.push('price >= ?');
    parameters.push(minPrice);
  }
  if (maxPrice !== null) {
    clauses.push('price <= ?');
    parameters.push(maxPrice);
  }

  try {
    const connection = await pool.getConnection();
    try {
      const [courses] = await connection.query(
        `SELECT id, title, description, category, price, cover_image, status, created_at, updated_at
         FROM courses
         WHERE ${clauses.join(' AND ')}
         ORDER BY created_at DESC, id DESC`,
        parameters
      );
      return {
        status: 200,
        body: courses.map(course => ({ ...course, price: Number(course.price) }))
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting courses:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to get courses.' } };
  }
}

export async function getPublishedCourseDetail(courseId) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [courseRows] = await connection.query(
      `SELECT id, title, description, category, price, cover_image, status, created_at, updated_at
       FROM courses
       WHERE id = ? AND status = 'published'
       LIMIT 1`,
      [courseId]
    );
    if (courseRows.length === 0) {
      return { status: 404, body: { code: 'COURSE_NOT_FOUND', message: 'The course was not found.' } };
    }

    const [lessonRows] = await connection.query(
      `SELECT id, title, order_index, created_at,
              CASE
                WHEN video_url IS NOT NULL AND video_url <> '' THEN 'video'
                WHEN document_url IS NOT NULL AND document_url <> '' THEN 'document'
                ELSE 'text'
              END AS lesson_type
       FROM lessons
       WHERE course_id = ?
       ORDER BY order_index ASC, id ASC`,
      [courseId]
    );
    const course = courseRows[0];
    return {
      status: 200,
      body: {
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          price: Number(course.price),
          cover_image: course.cover_image,
          status: course.status,
          created_at: course.created_at,
          updated_at: course.updated_at,
          lessonCount: lessonRows.length,
          lessons: lessonRows.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            orderIndex: lesson.order_index,
            type: lesson.lesson_type,
            createdAt: lesson.created_at
          }))
        }
      }
    };
  } catch (error) {
    console.error('Error getting published course detail:', error.message);
    return { status: 500, body: { code: 'COURSE_DETAIL_FAILED', message: 'The course could not be loaded.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function getPublishedCourseCategories() {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT category
       FROM courses
       WHERE status = 'published' AND category IS NOT NULL AND TRIM(category) <> ''
       ORDER BY category ASC`
    );
    const items = rows.map(row => row.category);
    return { status: 200, body: { items, total: items.length } };
  } catch (error) {
    console.error('Error getting course categories:', error.message);
    return { status: 500, body: { code: 'COURSE_CATEGORIES_FAILED', message: 'Course categories could not be loaded.' } };
  }
}

export async function getInstructorCourseProgress({ courseId, instructorId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [courseRows] = await connection.query(
      `SELECT id, title, status
       FROM courses
       WHERE id = ? AND instructor_id = ? AND status <> 'deleted'
       LIMIT 1`,
      [courseId, instructorId]
    );
    if (courseRows.length === 0) {
      return { status: 404, body: { code: 'COURSE_NOT_FOUND', message: 'The course was not found.' } };
    }
    const [enrollmentRows] = await connection.query(
      `SELECT id, student_id, status, progress_percent, enrolled_at
       FROM enrollments
       WHERE course_id = ?
       ORDER BY enrolled_at DESC, id DESC`,
      [courseId]
    );
    const items = enrollmentRows.map(row => ({
      enrollmentId: row.id,
      studentId: row.student_id,
      status: row.status,
      progressPercent: Number(row.progress_percent || 0),
      enrolledAt: row.enrolled_at
    }));
    const activeItems = items.filter(item => item.status === 'active');
    const averageProgress = activeItems.length === 0
      ? 0
      : Number((activeItems.reduce((sum, item) => sum + item.progressPercent, 0) / activeItems.length).toFixed(2));
    return {
      status: 200,
      body: {
        course: courseRows[0],
        summary: {
          totalEnrollments: items.length,
          activeEnrollments: activeItems.length,
          completedEnrollments: activeItems.filter(item => item.progressPercent >= 100).length,
          averageProgress
        },
        items
      }
    };
  } catch (error) {
    console.error('Error getting instructor course progress:', error.message);
    return { status: 500, body: { code: 'COURSE_PROGRESS_REPORT_FAILED', message: 'Course progress could not be loaded.' } };
  } finally {
    if (connection) connection.release();
  }
}

function validateAdminCourseReportFilters(filters = {}) {
  const category = validateOptionalText(filters.category, { field: 'Category', maxLength: 255 });
  if (category.error) return category;
  const dateFrom = validateOptionalDate(filters.dateFrom, 'Start date');
  if (dateFrom.error) return dateFrom;
  const dateTo = validateOptionalDate(filters.dateTo, 'End date');
  if (dateTo.error) return dateTo;
  if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
    return { error: 'Start date cannot be after end date.' };
  }
  let status = null;
  if (filters.status !== undefined) {
    if (typeof filters.status !== 'string' || !COURSE_STATUSES.has(filters.status.trim().toLowerCase())) {
      return { error: 'Status must be draft, pending_review, published, or rejected.' };
    }
    status = filters.status.trim().toLowerCase();
  }
  return { value: { category: category.value, dateFrom: dateFrom.value, dateTo: dateTo.value, status } };
}

export async function getAdminCourseReport(filters = {}) {
  const validation = validateAdminCourseReportFilters(filters);
  if (validation.error) {
    return { status: 400, body: { code: 'INVALID_REPORT_FILTER', message: validation.error } };
  }
  const clauses = ["c.status <> 'deleted'"];
  const parameters = [];
  const { category, dateFrom, dateTo, status } = validation.value;
  if (category) {
    clauses.push('c.category = ?');
    parameters.push(category);
  }
  if (status) {
    clauses.push('c.status = ?');
    parameters.push(status);
  }
  if (dateFrom) {
    clauses.push('c.created_at >= ?');
    parameters.push(dateFrom);
  }
  if (dateTo) {
    clauses.push('c.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    parameters.push(dateTo);
  }
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT c.id, c.title, c.category, c.status, c.price, c.created_at, c.updated_at,
              COUNT(e.id) AS enrollment_count,
              COALESCE(SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END), 0) AS active_enrollment_count,
              COALESCE(AVG(CASE WHEN e.status = 'active' THEN e.progress_percent END), 0) AS average_progress
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       ${whereClause}
       GROUP BY c.id, c.title, c.category, c.status, c.price, c.created_at, c.updated_at
       ORDER BY c.created_at DESC, c.id DESC`,
      parameters
    );
    const items = rows.map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      status: row.status,
      price: Number(row.price),
      enrollmentCount: Number(row.enrollment_count),
      activeEnrollmentCount: Number(row.active_enrollment_count),
      averageProgress: Number(Number(row.average_progress || 0).toFixed(2)),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    const totalEnrollments = items.reduce((sum, item) => sum + item.enrollmentCount, 0);
    const activeEnrollments = items.reduce((sum, item) => sum + item.activeEnrollmentCount, 0);
    return {
      status: 200,
      body: {
        summary: {
          totalCourses: items.length,
          publishedCourses: items.filter(item => item.status === 'published').length,
          draftCourses: items.filter(item => item.status === 'draft').length,
          pendingReviewCourses: items.filter(item => item.status === 'pending_review').length,
          rejectedCourses: items.filter(item => item.status === 'rejected').length,
          totalEnrollments,
          activeEnrollments
        },
        items
      }
    };
  } catch (error) {
    console.error('Error getting admin course report:', error.message);
    return { status: 500, body: { code: 'COURSE_REPORT_FAILED', message: 'The course report could not be loaded.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function moderateCourseStatus({ courseId, status }) {
  if (typeof status !== 'string' || !COURSE_STATUSES.has(status.trim().toLowerCase())) {
    return { status: 400, body: { code: 'INVALID_COURSE_STATUS', message: 'Status must be draft, pending_review, published, or rejected.' } };
  }
  const cleanStatus = status.trim().toLowerCase();
  let connection;
  try {
    connection = await pool.getConnection();
    const [existingRows] = await connection.query(
      `SELECT id FROM courses WHERE id = ? AND status <> 'deleted' LIMIT 1`,
      [courseId]
    );
    if (existingRows.length === 0) {
      return { status: 404, body: { code: 'COURSE_NOT_FOUND', message: 'The course was not found.' } };
    }
    await connection.query(
      `UPDATE courses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status <> 'deleted'`,
      [cleanStatus, courseId]
    );
    const [rows] = await connection.query(
      `SELECT id, title, category, price, status, created_at, updated_at
       FROM courses WHERE id = ? LIMIT 1`,
      [courseId]
    );
    const course = rows[0];
    return {
      status: 200,
      body: {
        course: {
          id: course.id,
          title: course.title,
          category: course.category,
          price: Number(course.price),
          status: course.status,
          createdAt: course.created_at,
          updatedAt: course.updated_at
        }
      }
    };
  } catch (error) {
    console.error('Error moderating course status:', error.message);
    return { status: 500, body: { code: 'COURSE_MODERATION_FAILED', message: 'The course status could not be updated.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateAdminCourseCategory({ courseId, category }) {
  const validation = validateOptionalText(category, { field: 'Category', maxLength: 255 });
  if (validation.error || validation.value === null) {
    return {
      status: 400,
      body: { code: 'INVALID_COURSE_CATEGORY', message: validation.error || 'Category is required.' }
    };
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [updateResult] = await connection.query(
      `UPDATE courses
       SET category = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status <> 'deleted'`,
      [validation.value, courseId]
    );
    if (updateResult.affectedRows === 0) {
      return { status: 404, body: { code: 'COURSE_NOT_FOUND', message: 'The course was not found.' } };
    }
    const [rows] = await connection.query(
      `SELECT id, title, category, status, price, instructor_id, created_at, updated_at
       FROM courses WHERE id = ? LIMIT 1`,
      [courseId]
    );
    const row = rows[0];
    return {
      status: 200,
      body: {
        course: {
          id: row.id,
          title: row.title,
          category: row.category,
          status: row.status,
          price: Number(row.price),
          instructorId: row.instructor_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      }
    };
  } catch (error) {
    console.error('Course category update failed:', error.message);
    return {
      status: 500,
      body: { code: 'COURSE_CATEGORY_UPDATE_FAILED', message: 'The course category could not be updated.' }
    };
  } finally {
    if (connection) connection.release();
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
  category,
  price,
  coverImage
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

  let cleanCategory = null;
  if (category !== undefined && category !== null && category !== '') {
    if (typeof category !== 'string' || !category.trim() || category.trim().length > 255) {
      return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Category must contain at most 255 characters.' } };
    }
    cleanCategory = category.trim();
  }

  const coverImageValidation = validateLessonUrl(coverImage, 'Cover image URL');
  if (coverImageValidation.error) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: coverImageValidation.error } };
  }

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
           category = ?,
           price = ?,
           cover_image = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE
           id = ?
           AND instructor_id = ?
           AND status = 'draft'`,
        [cleanTitle, cleanDescription, cleanCategory, parsedPrice, coverImageValidation.value, courseId, instructorId]
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
        `SELECT id, title, description, category, price, cover_image, status, instructor_id, created_at, updated_at
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
            category: updatedRow.category,
            price: Number(updatedRow.price),
            coverImage: updatedRow.cover_image,
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

export async function deleteInstructorDraft({ courseId, instructorId }) {
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

    const [enrollmentRows] = await connection.query(
      'SELECT COUNT(*) AS enrollment_count FROM enrollments WHERE course_id = ?',
      [courseId]
    );
    if (Number(enrollmentRows[0].enrollment_count) > 0) {
      await connection.rollback();
      return {
        status: 409,
        body: {
          code: 'COURSE_DELETE_NOT_ALLOWED',
          message: 'A course with enrollment history cannot be deleted.'
        }
      };
    }

    const [updateResult] = await connection.query(
      `UPDATE courses
       SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
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

    await connection.commit();
    return { status: 200, body: { deleted: true, courseId } };
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // The transaction may already be complete.
      }
    }
    console.error('Course draft deletion failed:', error.message);
    return {
      status: 500,
      body: { code: 'COURSE_DRAFT_DELETE_FAILED', message: 'The draft course could not be deleted.' }
    };
  } finally {
    if (connection) connection.release();
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
      `SELECT id, course_id, title, content, video_url, document_url, order_index, created_at
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
      `SELECT l.id, l.course_id, l.title, l.content, l.video_url, l.document_url,
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
      lessonContent: lesson.content || '',
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

export async function getPurchasableCourse(courseId, studentId) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.price, c.status,
              EXISTS(
                SELECT 1 FROM enrollments e
                WHERE e.course_id = c.id AND e.student_id = ? AND e.status = 'active'
              ) AS already_enrolled
       FROM courses c
       WHERE c.id = ? AND c.status = 'published'
       LIMIT 1`,
      [studentId, courseId]
    );
    if (rows.length === 0) {
      return { status: 404, body: { code: 'COURSE_NOT_AVAILABLE', message: 'The course is not available for purchase.' } };
    }
    const course = rows[0];
    if (Number(course.already_enrolled) === 1) {
      return { status: 409, body: { code: 'COURSE_ALREADY_ENROLLED', message: 'You already have access to this course.' } };
    }
    return {
      status: 200,
      body: { course: { id: course.id, title: course.title, price: Number(course.price), status: course.status } }
    };
  } catch (error) {
    console.error('Failed to load purchasable course:', error.message);
    return { status: 500, body: { code: 'COURSE_LOOKUP_FAILED', message: 'The course could not be verified.' } };
  }
}

export async function enrollInFreeCourse({ studentId, courseId }) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, price FROM courses
       WHERE id = ? AND status = 'published'
       LIMIT 1`,
      [courseId]
    );
    if (rows.length === 0) {
      return { status: 404, body: { code: 'COURSE_NOT_FOUND', message: 'The published course was not found.' } };
    }
    if (Number(rows[0].price) > 0) {
      return { status: 409, body: { code: 'PAYMENT_REQUIRED', message: 'Complete payment to enroll in this course.' } };
    }
  } catch (error) {
    console.error('Free course validation failed:', error.message);
    return { status: 500, body: { code: 'FREE_ENROLLMENT_FAILED', message: 'Free enrollment could not be completed.' } };
  } finally {
    if (connection) connection.release();
  }
  return activateEnrollment({ studentId, courseId });
}

export async function activateEnrollment({ studentId, courseId }) {
  let connection;
  let enrollmentId;
  let newlyActivated = false;
  let activatedAt;
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
      `SELECT id, status FROM enrollments
       WHERE student_id = ? AND course_id = ?
       LIMIT 1 FOR UPDATE`,
      [studentId, courseId]
    );
    if (existing.length > 0) {
      enrollmentId = existing[0].id;
      if (existing[0].status !== 'active') {
        await connection.query(
          `UPDATE enrollments SET status = 'active' WHERE id = ?`,
          [enrollmentId]
        );
        newlyActivated = true;
      }
    } else {
      const [insertResult] = await connection.query(
        `INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'active')`,
        [studentId, courseId]
      );
      enrollmentId = insertResult.insertId;
      newlyActivated = true;
    }
    activatedAt = new Date().toISOString();
    await connection.commit();
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // The transaction may already have completed.
      }
    }
    console.error('Failed to activate enrollment:', error.message);
    return { status: 500, body: { code: 'ENROLLMENT_ACTIVATION_FAILED', message: 'Course access could not be activated.' } };
  } finally {
    if (connection) connection.release();
  }

  if (newlyActivated) {
    try {
      await publishCourseAccessActivated({ studentId, courseId, enrollmentId, activatedAt });
    } catch (error) {
      const errorCode = error?.code || error?.name || 'UNKNOWN';
      console.error(`Course access was activated, but its event could not be published (${errorCode}).`);
    }
  }

  return {
    status: 200,
    body: { enrollment: { id: enrollmentId, studentId, courseId, status: 'active' } }
  };
}

export async function getInstructorCourses(instructorId) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT c.id, c.title, c.description, c.category, c.price, c.cover_image,
              c.status, c.created_at, c.updated_at,
              COUNT(DISTINCT l.id) AS lesson_count,
              COUNT(DISTINCT e.id) AS enrollment_count
       FROM courses c
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN enrollments e ON e.course_id = c.id
       WHERE c.instructor_id = ? AND c.status <> 'deleted'
       GROUP BY c.id, c.title, c.description, c.category, c.price, c.cover_image,
                c.status, c.created_at, c.updated_at
       ORDER BY c.updated_at DESC, c.id DESC`,
      [instructorId]
    );
    return {
      status: 200,
      body: {
        items: rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          price: Number(row.price),
          coverImage: row.cover_image,
          status: row.status,
          lessonCount: Number(row.lesson_count),
          enrollmentCount: Number(row.enrollment_count),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })),
        total: rows.length
      }
    };
  } catch (error) {
    console.error('Failed to load instructor courses:', error.message);
    return { status: 500, body: { code: 'INSTRUCTOR_COURSES_FAILED', message: 'Instructor courses could not be loaded.' } };
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

