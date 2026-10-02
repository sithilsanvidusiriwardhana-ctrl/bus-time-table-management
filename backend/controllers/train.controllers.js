import { getStationModel, getTrainModel, getTrainNoticeModel } from '../modules/train.modules.js';

const railwayLines = ['Railway Line 1', 'Railway Line 2'];
const timePattern = /^\d{2}:\d{2}$/;

function validLine(line) {
  return railwayLines.includes(String(line || '').trim());
}

export async function getStations(req, res) {
  try {
    const Station = getStationModel();
    res.json({ stations: await Station.find().sort({ railway_line: 1, station_name: 1 }).lean() });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load stations.', error: error.message });
  }
}

export async function createStation(req, res) {
  try {
    const station_name = String(req.body.station_name || '').trim();
    const station_code = String(req.body.station_code || '').trim().toUpperCase();
    const railway_line = String(req.body.railway_line || '').trim();
    if (!station_name || !station_code || !validLine(railway_line)) {
      return res.status(400).json({ message: 'Station name, code, and one of the two railway lines are required.' });
    }
    const Station = getStationModel();
    const station = await Station.create({ station_name, station_code, railway_line });
    res.status(201).json({ message: 'Station added.', station });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'That station code already exists.' : 'Unable to add station.', error: error.message });
  }
}

export async function deleteStation(req, res) {
  try {
    const [Station, Train] = [getStationModel(), getTrainModel()];
    if (await Train.exists({ 'stops.station_id': req.params.id })) {
      return res.status(409).json({ message: 'Remove this station from train timetables before deleting it.' });
    }
    const station = await Station.findByIdAndDelete(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found.' });
    res.json({ message: 'Station deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete station.', error: error.message });
  }
}

export async function getTrains(req, res) {
  try {
    const Train = getTrainModel();
    res.json({ trains: await Train.find().sort({ train_number: 1 }).lean() });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load trains.', error: error.message });
  }
}

export async function createTrain(req, res) {
  try {
    const train_number = String(req.body.train_number || '').trim();
    const train_name = String(req.body.train_name || '').trim();
    if (!train_number || !train_name) {
      return res.status(400).json({ message: 'Train number and name are required.' });
    }
    const Train = getTrainModel();
    const train = await Train.create({ train_number, train_name });
    res.status(201).json({ message: 'Train added.', train });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'That train number already exists.' : 'Unable to add train.', error: error.message });
  }
}

export async function deleteTrain(req, res) {
  try {
    const Train = getTrainModel();
    const train = await Train.findByIdAndDelete(req.params.id);
    if (!train) return res.status(404).json({ message: 'Train not found.' });
    res.json({ message: 'Train deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete train.', error: error.message });
  }
}

export async function addTrainStop(req, res) {
  try {
    const stationId = String(req.body.station_id || '').trim();
    const arrival_time = String(req.body.arrival_time || '').trim();
    const departure_time = String(req.body.departure_time || '').trim();
    if (!stationId || (!arrival_time && !departure_time) || (arrival_time && !timePattern.test(arrival_time)) || (departure_time && !timePattern.test(departure_time))) {
      return res.status(400).json({ message: 'Choose a station and enter a valid arrival or departure time.' });
    }
    const [Station, Train] = [getStationModel(), getTrainModel()];
    const [station, train] = await Promise.all([Station.findById(stationId), Train.findById(req.params.id)]);
    if (!station) return res.status(400).json({ message: 'Choose an existing station.' });
    if (!train) return res.status(404).json({ message: 'Train not found.' });
    if (train.stops.some((stop) => String(stop.station_id) === String(station._id))) return res.status(409).json({ message: 'This station is already in the timetable.' });
    train.stops.push({ station_id: station._id, station_name: station.station_name, station_code: station.station_code, arrival_time, departure_time });
    await train.save();
    res.status(201).json({ message: 'Stop added to timetable.', train });
  } catch (error) {
    res.status(500).json({ message: 'Unable to add train stop.', error: error.message });
  }
}

export async function deleteTrainStop(req, res) {
  try {
    const Train = getTrainModel();
    const train = await Train.findById(req.params.id);
    if (!train) return res.status(404).json({ message: 'Train not found.' });
    const previousCount = train.stops.length;
    train.stops = train.stops.filter((stop) => String(stop._id) !== String(req.params.stopId));
    if (train.stops.length === previousCount) return res.status(404).json({ message: 'Stop not found.' });
    await train.save();
    res.json({ message: 'Stop deleted from timetable.', train });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete train stop.', error: error.message });
  }
}

export async function getTrainNotices(req, res) {
  try {
    const TrainNotice = getTrainNoticeModel();
    res.json({ notices: await TrainNotice.find().sort({ createdAt: -1 }).lean() });
  } catch (error) { res.status(500).json({ message: 'Unable to load notices.', error: error.message }); }
}

export async function createTrainNotice(req, res) {
  try {
    const title = String(req.body.title || '').trim();
    const message = String(req.body.message || '').trim();
    if (!title || !message) return res.status(400).json({ message: 'Notice title and message are required.' });
    const TrainNotice = getTrainNoticeModel();
    res.status(201).json({ message: 'Notice published.', notice: await TrainNotice.create({ title, message }) });
  } catch (error) { res.status(500).json({ message: 'Unable to publish notice.', error: error.message }); }
}
