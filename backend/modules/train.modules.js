import mongoose from 'mongoose';

function trainStatusDb() {
  // Shares the configured MongoDB cluster while using the separate database
  // requested for railway data.
  return mongoose.connection.useDb('train_status', { useCache: true });
}

const stationSchema = new mongoose.Schema({
  station_name: { type: String, required: true, trim: true },
  station_code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  railway_line: { type: String, required: true, enum: ['Railway Line 1', 'Railway Line 2'] },
}, { timestamps: true, collection: 'stations' });

const trainStopSchema = new mongoose.Schema({
  station_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  station_name: { type: String, required: true },
  station_code: { type: String, required: true },
  arrival_time: { type: String, default: '' },
  departure_time: { type: String, default: '' },
}, { _id: true });

const trainSchema = new mongoose.Schema({
  train_number: { type: String, required: true, trim: true, unique: true },
  train_name: { type: String, required: true, trim: true },
  stops: { type: [trainStopSchema], default: [] },
}, { timestamps: true, collection: 'trains' });

// Accounts in this collection are maintained manually in train_status.
// Required fields: username and password. name is optional.
const trainMasterSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
}, { collection: 'train_master' });

const trainNoticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
}, { timestamps: true, collection: 'train_notices' });

export function getStationModel() {
  const db = trainStatusDb();
  return db.models.Station || db.model('Station', stationSchema);
}

export function getTrainModel() {
  const db = trainStatusDb();
  return db.models.Train || db.model('Train', trainSchema);
}

export function getTrainMasterModel() {
  const db = trainStatusDb();
  return db.models.TrainMaster || db.model('TrainMaster', trainMasterSchema);
}

export function getTrainNoticeModel() {
  const db = trainStatusDb();
  return db.models.TrainNotice || db.model('TrainNotice', trainNoticeSchema);
}
