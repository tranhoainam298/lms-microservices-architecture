import { checkStudentExamAccess, createDraftCourse, createLessonForInstructorDraft, deleteLessonForInstructorDraft, getLesson, getLessonsForInstructorDraft, getCourses, getEnrolledCourses, getInstructorDrafts, publishInstructorDraft, updateInstructorDraft, updateLessonForInstructorDraft } from '../services/courseService.js';

export async function createDraft(req, res) {
  const payload = req.body || {};
  const instructorId = req.user.id;
  
  const result = await createDraftCourse({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    price: payload.price,
    cover_image: payload.cover_image,
    instructorId,
    lessons: payload.lessons
  });
  res.status(result.status).json(result.body);
}

function parsePositiveRouteId(res, value, code, label) {
  const text = String(value);
  const parsedValue = Number(text);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(parsedValue)) {
    res.status(400).json({
      code,
      message: `${label} must be a positive integer.`
    });
    return null;
  }
  return parsedValue;
}

export function legacyLessonCreationDeprecatedHandler(req, res) {
  res.status(410).json({
    code: 'ENDPOINT_DEPRECATED',
    message: 'Use POST /courses/drafts/:courseId/lessons.'
  });
}

export async function checkStudentExamAccessHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;

  const result = await checkStudentExamAccess({ courseId, studentId: req.user.id });
  res.status(result.status).json(result.body);
}

export async function createLessonForInstructorDraftHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;

  const payload = req.body || {};
  const result = await createLessonForInstructorDraft({
    courseId,
    instructorId: req.user.id,
    title: payload.title,
    videoUrl: payload.videoUrl,
    documentUrl: payload.documentUrl
  });

  res.status(result.status).json(result.body);
}

export async function getLessonsForInstructorDraftHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;

  const result = await getLessonsForInstructorDraft({ courseId, instructorId: req.user.id });
  res.status(result.status).json(result.body);
}

export async function updateLessonForInstructorDraftHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  if (courseId === null || lessonId === null) return;

  const payload = req.body || {};
  const result = await updateLessonForInstructorDraft({
    courseId,
    lessonId,
    instructorId: req.user.id,
    title: payload.title,
    videoUrl: payload.videoUrl,
    documentUrl: payload.documentUrl
  });
  res.status(result.status).json(result.body);
}

export async function deleteLessonForInstructorDraftHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  if (courseId === null || lessonId === null) return;

  const result = await deleteLessonForInstructorDraft({
    courseId,
    lessonId,
    instructorId: req.user.id
  });
  res.status(result.status).json(result.body);
}

export async function getLessonHandler(req, res) {
  const { lessonId } = req.params;
  const studentId = req.get('x-user-id'); // assuming API Gateway passes student ID here
  
  const result = await getLesson(lessonId, studentId);
  res.status(result.status).json(result.body);
}

export async function getCoursesHandler(req, res) {
  const result = await getCourses();
  res.status(result.status).json(result.body);
}

export async function getEnrolledCoursesHandler(req, res) {
  const studentId = req.get('x-user-id');
  const result = await getEnrolledCourses(studentId);
  res.status(result.status).json(result.body);
}

export async function getInstructorDraftsHandler(req, res) {
  const instructorId = req.user?.id;
  const result = await getInstructorDrafts(instructorId);
  res.status(result.status).json(result.body);
}

export async function updateDraftHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;

  const payload = req.body || {};
  const instructorId = req.user?.id;

  const result = await updateInstructorDraft({
    courseId,
    instructorId,
    title: payload.title,
    description: payload.description,
    price: payload.price
  });

  res.status(result.status).json(result.body);
}

export async function publishDraftHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;

  const result = await publishInstructorDraft({
    courseId,
    instructorId: req.user.id
  });

  res.status(result.status).json(result.body);
}
