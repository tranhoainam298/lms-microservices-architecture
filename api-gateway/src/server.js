import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import userRoutes from './routes/userRoutes.js';
import examRoutes from './routes/examRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

const trustProxyHops = process.env.TRUST_PROXY_HOPS;
if (trustProxyHops !== undefined) {
  const hops = parseInt(trustProxyHops, 10);
  if (!isNaN(hops)) {
    app.set('trust proxy', hops);
  } else if (trustProxyHops === 'true') {
    app.set('trust proxy', true);
  }
}

app.use(cors({ origin: process.env.WEB_CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use('/users', userRoutes);
app.use(['/quizzes', '/questions'], (req, res) => res.status(410).json({
  code: 'ENDPOINT_DEPRECATED',
  message: 'Use the secure /exams endpoints.'
}));
app.use('/exams', examRoutes);
app.use('/payments', paymentRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API Gateway listening on http://localhost:${port}`);
});
