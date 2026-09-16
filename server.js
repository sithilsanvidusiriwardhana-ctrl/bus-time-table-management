import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import passengerRoutes from './backend/routes/passenger.route.js';
import driverRoutes from './backend/routes/driver.routes.js';  
import shedulleRoutes from './backend/routes/shedulle.routes.js';  
import userRoutes from './backend/routes/user.routes.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'foundend')));

// Construct URI safely from environment variables
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;

// Use your direct standard connection string or construct it safely
const uri = process.env.DBURL || process.env.MONGODB_URI || (
  username && password 
    ? `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@ac-1wsnn2f-shard-00-00.rixzmqt.mongodb.net:27017,ac-1wsnn2f-shard-00-01.rixzmqt.mongodb.net:27017,ac-1wsnn2f-shard-00-02.rixzmqt.mongodb.net:27017/busSystem?ssl=true&replicaSet=atlas-i15p3v-shard-0&authSource=admin&retryWrites=true&w=majority`
    : undefined
);

// Connect using Mongoose and wait for connection before starting the server
async function startServer() {
  try {
    if (!uri) {
      throw new Error("Database URI is undefined. Check your .env file!");
    }

    await mongoose.connect(uri);
    console.log("Successfully connected to MongoDB Cluster0 with Mongoose!");

    // Mount your passenger routes after a successful database connection
    app.use('/api/passengers', passengerRoutes);
    app.use('/api/drivers', driverRoutes);
    app.use('/api/shedulle', shedulleRoutes);
    app.use('/api/users', userRoutes);

    app.listen(port, () => {
      console.log(`Express server is running on http://localhost:${port}`);
    });
    
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

startServer();