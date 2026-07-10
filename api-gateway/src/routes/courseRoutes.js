import { Router } from 'express';
import { forwardCreateDraft, forwardCreateLesson, forwardGetLesson, forwardGetCourses, forwardGetEnrolledCourses } from '../proxy/courseServiceProxy.js';
import { jwtAuth } from '../middleware/jwtAuth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const upstreamResponse = await forwardGetCourses(req.user);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/enrolled', jwtAuth, async (req, res, next) => {
  try {
    const upstreamResponse = await forwardGetEnrolledCourses(req.user);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/draft', jwtAuth, async (req, res, next) => {
  try {
    const upstreamResponse = await forwardCreateDraft(req.body, req.user);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/lessons', jwtAuth, async (req, res, next) => {
  try {
    const upstreamResponse = await forwardCreateLesson(req.body, req.user);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.get('/lessons/:lessonId', jwtAuth, async (req, res, next) => {
  try {
    const upstreamResponse = await forwardGetLesson(req.params.lessonId, req.user);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

export default router;
