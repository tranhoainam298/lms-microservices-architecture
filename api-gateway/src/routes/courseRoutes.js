import { Router } from 'express';
import { forwardAskAiAboutLesson, forwardCompleteLesson, forwardCreateDraft, forwardCreateLessonForDraft, forwardDeleteDraft, forwardDeleteLessonForDraft, forwardEnrollInFreeCourse, forwardGetAdminCourseReport, forwardGetCourseCategories, forwardGetCourseLearning, forwardGetInstructorCourseProgress, forwardGetInstructorCourses, forwardGetLesson, forwardGetLessonsForDraft, forwardGetCourses, forwardGetEnrolledCourses, forwardGetDrafts, forwardGetPublishedCourseDetail, forwardModerateCourseStatus, forwardPublishDraft, forwardReorderLessonsForDraft, forwardUpdateCourseCategory, forwardUpdateDraft, forwardUpdateLessonForDraft } from '../proxy/courseServiceProxy.js';
import { jwtAuth } from '../middleware/jwtAuth.js';

const router = Router();

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

function validateScalarQuery(res, query, allowedKeys) {
  for (const key of allowedKeys) {
    if (query[key] !== undefined && typeof query[key] !== 'string') {
      res.status(400).json({ code: 'INVALID_QUERY', message: `${key} must be provided once as a string value.` });
      return false;
    }
  }
  return true;
}

router.get('/', async (req, res, next) => {
  try {
    if (!validateScalarQuery(res, req.query, ['search', 'category', 'minPrice', 'maxPrice'])) return;
    const upstreamResponse = await forwardGetCourses(req.query);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const upstreamResponse = await forwardGetCourseCategories();
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/reports/courses', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only administrators can view course reports.' });
    }
    if (!validateScalarQuery(res, req.query, ['dateFrom', 'dateTo', 'category', 'status'])) return;
    const upstreamResponse = await forwardGetAdminCourseReport(req.query, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/:courseId/status', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only administrators can moderate courses.' });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardModerateCourseStatus(courseId, req.body, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/:courseId/category', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only administrators can categorize courses.' });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardUpdateCourseCategory(courseId, req.body, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/instructor/:courseId/progress', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only instructors can view course progress.' });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardGetInstructorCourseProgress(courseId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/instructor/mine', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only instructors can view their courses.' });
    }
    const upstreamResponse = await forwardGetInstructorCourses(req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/enrolled', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only students can view enrolled courses.' });
    }
    const upstreamResponse = await forwardGetEnrolledCourses(req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/drafts/mine', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can view course drafts.'
      });
    }
    const upstreamResponse = await forwardGetDrafts(req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.patch('/drafts/:courseId', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can update draft courses.'
      });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardUpdateDraft(courseId, req.body, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.delete('/drafts/:courseId', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can delete course drafts.'
      });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardDeleteDraft(courseId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/draft', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can create draft courses.'
      });
    }
    const upstreamResponse = await forwardCreateDraft(req.body, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/:courseId/learning', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only students can access course lessons.' });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardGetCourseLearning(courseId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.patch('/drafts/:courseId/publish', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can publish courses.'
      });
    }
    const upstreamResponse = await forwardPublishDraft(req.params.courseId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/drafts/:courseId/lessons', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can create lessons.'
      });
    }

    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) {
      return;
    }

    const upstreamResponse = await forwardCreateLessonForDraft(
      courseId,
      req.body,
      req.headers.authorization
    );
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/drafts/:courseId/lessons', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can view lessons for draft courses.'
      });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) {
      return;
    }
    const upstreamResponse = await forwardGetLessonsForDraft(courseId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.patch('/drafts/:courseId/lessons/reorder', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can reorder lessons.'
      });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardReorderLessonsForDraft(courseId, req.body, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.patch('/drafts/:courseId/lessons/:lessonId', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can update lessons.'
      });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
    if (courseId === null || lessonId === null) {
      return;
    }
    const upstreamResponse = await forwardUpdateLessonForDraft(courseId, lessonId, req.body, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.delete('/drafts/:courseId/lessons/:lessonId', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only instructors can delete lessons.'
      });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
    if (courseId === null || lessonId === null) {
      return;
    }
    const upstreamResponse = await forwardDeleteLessonForDraft(courseId, lessonId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/lessons', (req, res) => {
  res.status(410).json({
    code: 'ENDPOINT_DEPRECATED',
    message: 'Use POST /courses/drafts/:courseId/lessons.'
  });
});

router.get('/lessons/:lessonId', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only students can access course lessons.' });
    }
    const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
    if (lessonId === null) return;
    const upstreamResponse = await forwardGetLesson(lessonId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/lessons/:lessonId/complete', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only students can update learning progress.' });
    }
    const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
    if (lessonId === null) return;
    const upstreamResponse = await forwardCompleteLesson(lessonId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/lessons/:lessonId/ai/ask', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only students can use AI learning support.' });
    }
    const lessonId = parsePositiveRouteId(res, req.params.lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
    if (lessonId === null) return;
    const upstreamResponse = await forwardAskAiAboutLesson(lessonId, req.body, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/:courseId/enroll', jwtAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Only students can enroll in courses.' });
    }
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardEnrollInFreeCourse(courseId, req.headers.authorization);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/:courseId', async (req, res, next) => {
  try {
    const courseId = parsePositiveRouteId(res, req.params.courseId, 'INVALID_COURSE_ID', 'Course ID');
    if (courseId === null) return;
    const upstreamResponse = await forwardGetPublishedCourseDetail(courseId);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

export default router;
