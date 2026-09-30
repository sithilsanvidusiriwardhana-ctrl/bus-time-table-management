import mongoose from 'mongoose';

let departureLogsConnection = null;

/**
 * Returns a dedicated Mongoose connection to "departureLogsDB".
 * Builds the URI from the same DB_USERNAME / DB_PASSWORD env vars
 * that the main busSystem connection uses — just a different database name.
 */
export function getDepartureLogsDb() {
  if (departureLogsConnection) {
    return departureLogsConnection;
  }

  const username = (process.env.DB_USERNAME || '').trim();
  const password = (process.env.DB_PASSWORD || '').trim();

  if (!username || !password) {
    throw new Error('DB_USERNAME or DB_PASSWORD is not set in .env');
  }

  // Same Atlas cluster as busSystem, but database = departureLogsDB
  const uri =
    `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}` +
    `@ac-1wsnn2f-shard-00-00.rixzmqt.mongodb.net:27017,` +
    `ac-1wsnn2f-shard-00-01.rixzmqt.mongodb.net:27017,` +
    `ac-1wsnn2f-shard-00-02.rixzmqt.mongodb.net:27017` +
    `/departureLogsDB?ssl=true&replicaSet=atlas-i15p3v-shard-0&authSource=admin&retryWrites=true&w=majority`;

  departureLogsConnection = mongoose.createConnection(uri);

  departureLogsConnection.on('connected', () => {
    console.log('✅ departureLogsDB connected (separate from busSystem).');
  });

  departureLogsConnection.on('error', (err) => {
    console.error('❌ departureLogsDB connection error:', err.message);
  });

  return departureLogsConnection;
}
