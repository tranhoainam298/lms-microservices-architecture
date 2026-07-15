import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}
import cors from 'cors';
import express from 'express';
import courseRoutes from './routes/courseRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { migrateEnrollmentUniqueness } from './data/migrateEnrollmentUniqueness.js';
import { migrateLessonContent } from './data/migrateLessonContent.js';
import { migrateLessonProgress } from './data/migrateLessonProgress.js';

const app = express();
const port = Number(process.env.PORT) || 5002;

app.use(cors());
app.use(express.json());
app.use('/courses', courseRoutes);
app.use(errorHandler);

try {
  await migrateEnrollmentUniqueness();
  await migrateLessonContent();
  await migrateLessonProgress();
  app.listen(port, () => {
    console.log(`Course Service listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error('FATAL ERROR: Course database migration failed:', error.message);
  process.exit(1);
}
