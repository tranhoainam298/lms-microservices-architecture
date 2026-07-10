import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}
const bcryptSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
if (!Number.isInteger(bcryptSaltRounds) || bcryptSaltRounds < 10 || bcryptSaltRounds > 14) {
  console.error('FATAL ERROR: BCRYPT_SALT_ROUNDS must be an integer from 10 through 14.');
  process.exit(1);
}
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDatabase } from './data/initDb.js';
import { connectRabbitMQ } from './events/publisher.js';

const app = express();
const port = Number(process.env.PORT) || 5001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use(errorHandler);

app.listen(port, async () => {
  await initializeDatabase();
  await connectRabbitMQ();
  console.log(`User Service listening on http://localhost:${port}`);
});


