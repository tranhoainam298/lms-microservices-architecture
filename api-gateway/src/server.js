import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors({ origin: process.env.WEB_CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API Gateway listening on http://localhost:${port}`);
});
