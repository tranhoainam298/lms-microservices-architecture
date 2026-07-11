import { Router } from 'express';
import { forwardPaymentRequest } from '../proxy/paymentServiceProxy.js';

const router = Router();

router.use(async (req, res, next) => {
  try {
    const upstreamResponse = await forwardPaymentRequest(req);
    if (typeof upstreamResponse.body === 'string') {
      return res.status(upstreamResponse.status).send(upstreamResponse.body);
    }
    return res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    return next(error);
  }
});

export default router;
