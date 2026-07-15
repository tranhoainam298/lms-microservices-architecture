import { activateEnrollment, askAiAboutLesson, checkInstructorCourseAccess, checkStudentExamAccess, completeStudentLesson, createDraftCourse, createLessonForInstructorDraft, deleteInstructorDraft, deleteLessonForInstructorDraft, enrollInFreeCourse, getAdminCourseReport, getCourseTitlesInternal, getInstructorCourseProgress, getInstructorCourses, getLesson, getLessonsForInstructorDraft, getCourses, getEnrolledCourses, getInstructorDrafts, getPublishedCourseCategories, getPublishedCourseDetail, getPurchasableCourse, getStudentCourseLearning, moderateCourseStatus, publishInstructorDraft, reorderLessonsForInstructorDraft, updateAdminCourseCategory, updateInstructorDraft, updateLessonForInstructorDraft } from '../services/courseService.js';

export async function createDraft(req, res) {
  const payload = req.body || {};
  const instructorId = req.user.id;
  
  const result = await createDraftCourse({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    price: payload.price,
    cover_image: payload.coverImage ?? payload.cover_image,
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

export async function getPurchasableCourseHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const studentId = parsePositiveRouteId(res, req.query?.studentId, 'INVALID_STUDENT_ID', 'Student ID');
  if (studentId === null) return;
  const result = await getPurchasableCourse(courseId, studentId);
  res.status(result.status).json(result.body);
}

export async function activateEnrollmentHandler(req, res) {
  const studentId = parsePositiveRouteId(res, req.body?.studentId, 'INVALID_STUDENT_ID', 'Student ID');
  if (studentId === null) return;
  const courseId = parsePositiveRouteId(res, req.body?.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const result = await activateEnrollment({ studentId, courseId });
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
    content: payload.content,
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
    content: payload.content,
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
  const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  if (lessonId === null) return;
  const result = await getLesson(lessonId, req.user.id);
  res.status(result.status).json(result.body);
}

export async function getStudentCourseLearningHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const result = await getStudentCourseLearning({ courseId, studentId: req.user.id });
  res.status(result.status).json(result.body);
}

export async function completeStudentLessonHandler(req, res) {
  const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  if (lessonId === null) return;
  const result = await completeStudentLesson({ lessonId, studentId: req.user.id });
  res.status(result.status).json(result.body);
}

export async function askAiAboutLessonHandler(req, res) {
  const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  if (lessonId === null) return;
  const result = await askAiAboutLesson({
    lessonId,
    studentId: req.user.id,
    question: req.body?.question
  });
  res.status(result.status).json(result.body);
}

export async function getCoursesHandler(req, res) {
  const result = await getCourses({
    search: req.query?.search,
    category: req.query?.category,
    priceType: req.query?.priceType,
    minPrice: req.query?.minPrice,
    maxPrice: req.query?.maxPrice
  });
  res.status(result.status).json(result.body);
}

export async function reorderLessonsForInstructorDraftHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;

  const result = await reorderLessonsForInstructorDraft({
    courseId,
    instructorId: req.user.id,
    lessonIds: req.body?.lessonIds
  });
  res.status(result.status).json(result.body);
}

export async function checkInstructorCourseAccessHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const result = await checkInstructorCourseAccess({ courseId, instructorId: req.user.id });
  res.status(result.status).json(result.body);
}

export async function getPublishedCourseDetailHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const result = await getPublishedCourseDetail(courseId);
  res.status(result.status).json(result.body);
}

export async function getPublishedCourseCategoriesHandler(req, res) {
  const result = await getPublishedCourseCategories();
  res.status(result.status).json(result.body);
}

export async function getInstructorCourseProgressHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const result = await getInstructorCourseProgress({ courseId, instructorId: req.user.id });
  res.status(result.status).json(result.body);
}

export async function getAdminCourseReportHandler(req, res) {
  const result = await getAdminCourseReport({
    dateFrom: req.query?.dateFrom,
    dateTo: req.query?.dateTo,
    category: req.query?.category,
    status: req.query?.status,
    instructorId: req.query?.instructorId
  });
  res.status(result.status).json(result.body);
}

export async function moderateCourseStatusHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const result = await moderateCourseStatus({ courseId, status: req.body?.status });
  res.status(result.status).json(result.body);
}

export async function updateAdminCourseCategoryHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const result = await updateAdminCourseCategory({ courseId, category: req.body?.category });
  res.status(result.status).json(result.body);
}

export async function getEnrolledCoursesHandler(req, res) {
  const result = await getEnrolledCourses(req.user.id);
  res.status(result.status).json(result.body);
}

export async function getInstructorDraftsHandler(req, res) {
  const instructorId = req.user?.id;
  const result = await getInstructorDrafts(instructorId);
  res.status(result.status).json(result.body);
}

export async function enrollInFreeCourseHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;
  const result = await enrollInFreeCourse({ studentId: req.user.id, courseId });
  res.status(result.status).json(result.body);
}

export async function getInstructorCoursesHandler(req, res) {
  const result = await getInstructorCourses(req.user.id);
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
    category: payload.category,
    price: payload.price,
    coverImage: payload.coverImage ?? payload.cover_image
  });

  res.status(result.status).json(result.body);
}

export async function deleteDraftHandler(req, res) {
  const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
  if (courseId === null) return;

  const result = await deleteInstructorDraft({
    courseId,
    instructorId: req.user.id
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

export async function getCourseTitlesInternalHandler(req, res) {
  const result = await getCourseTitlesInternal(req.query?.ids);
  res.status(result.status).json(result.body);
}
