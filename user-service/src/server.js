import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDatabase } from './data/initDb.js';
import { connectRabbitMQ } from './events/publisher.js';

const app = express();
const port = Number(process.env.PORT) || 5001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

app.listen(port, async () => {
  await initializeDatabase();
  await connectRabbitMQ();
  console.log(`User Service listening on http://localhost:${port}`);
});


