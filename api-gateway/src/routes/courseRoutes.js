import { Router } from 'express';
import { forwardAskAiAboutLesson, forwardCompleteLesson, forwardCreateDraft, forwardCreateLessonForDraft, forwardDeleteLessonForDraft, forwardGetCourseLearning, forwardGetLesson, forwardGetLessonsForDraft, forwardGetCourses, forwardGetEnrolledCourses, forwardGetDrafts, forwardPublishDraft, forwardUpdateDraft, forwardUpdateLessonForDraft } from '../proxy/courseServiceProxy.js';
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

router.get('/', async (req, res, next) => {
  try {
    const upstreamResponse = await forwardGetCourses();
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
    const courseId = req.params.courseId;
    const upstreamResponse = await forwardUpdateDraft(courseId, req.body, req.headers.authorization);
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

export default router;
