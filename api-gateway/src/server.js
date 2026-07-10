import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import examRoutes from './routes/examRoutes.js';
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
app.use('/quizzes', examRoutes);
app.use('/questions', examRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API Gateway listening on http://localhost:${port}`);
});
