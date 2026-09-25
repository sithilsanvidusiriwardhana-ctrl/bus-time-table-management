import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import passengerRoutes from './backend/routes/passenger.route.js';
import driverRoutes from './backend/routes/driver.routes.js';  
import shedulleRoutes from './backend/routes/shedulle.routes.js';  
import userRoutes from './backend/routes/user.routes.js';
dotenv.config();

const currentDirectory = process.cwd();

const app = express();
const port = process.env.PORT || 8000;
const getRouter = (routeModule) => routeModule?.default || routeModule;

const passengerRouter = getRouter(passengerRoutes);
const driverRouter = getRouter(driverRoutes);
const shedulleRouter = getRouter(shedulleRoutes);
const userRouter = getRouter(userRoutes);

app.use(express.json());
app.use(express.static(path.join(currentDirectory, 'foundend')));

app.use('/api/passengers', passengerRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/shedulle', shedulleRouter);
app.use('/api/users', userRouter);

// Construct URI safely from environment variables
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;

// Use your direct standard connection string or construct it safely
const uri = process.env.DBURL || process.env.MONGODB_URI || (
  username && password 
    ? `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@ac-1wsnn2f-shard-00-00.rixzmqt.mongodb.net:27017,ac-1wsnn2f-shard-00-01.rixzmqt.mongodb.net:27017,ac-1wsnn2f-shard-00-02.rixzmqt.mongodb.net:27017/busSystem?ssl=true&replicaSet=atlas-i15p3v-shard-0&authSource=admin&retryWrites=true&w=majority`
    : undefined
);

let databaseConnection;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (!uri) {
    throw new Error('Database URI is undefined. Configure MONGODB_URI or DBURL.');
  }
  databaseConnection ??= mongoose.connect(uri);
  await databaseConnection;
  console.log('Successfully connected to MongoDB with Mongoose.');
}

export { app };

if (!process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  connectDatabase()
    .then(() => {
      app.listen(port, '0.0.0.0', () => {
        console.log(`Express server is running on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error.message);
      process.exit(1);
    });
}