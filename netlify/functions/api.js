import serverless from 'serverless-http';
import { app, connectDatabase } from '../../server.js';

const expressHandler = serverless(app);

export const handler = async (event, context) => {
  try {
    await connectDatabase();
    return await expressHandler(event, context);
  } catch (error) {
    console.error('API request failed:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Database connection failed.' }),
    };
  }
};
