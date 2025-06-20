import express from 'express';
import cors from 'cors';
import { initSocketServer } from '../config/socketServer.js';
import http from 'http';

import mainRouter from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);

initSocketServer(httpServer);
app.use(cors({origin: '*'})); // Allow all origins for development; restrict in production
app.use(express.json());

app.use('/api', mainRouter);
app.use(errorHandler);

httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Socket.IO server is listening on port ${PORT}`);
});