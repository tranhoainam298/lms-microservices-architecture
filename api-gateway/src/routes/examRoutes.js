import express from 'express';
import { forwardExamRequest } from '../proxy/examServiceProxy.js';

const router = express.Router();

router.all('/*', async (req, res, next) => {
  try {
    const upstreamResponse = await forwardExamRequest(req);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

export default router;
