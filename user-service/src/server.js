import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`User Service listening on http://localhost:${port}`);
});
