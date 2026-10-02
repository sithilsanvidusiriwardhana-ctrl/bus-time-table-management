import { Router } from 'express';
import { addTrainStop, createStation, createTrain, createTrainNotice, deleteStation, deleteTrain, deleteTrainStop, getStations, getTrainNotices, getTrains } from '../controllers/train.controllers.js';

const router = Router();

router.get('/stations', getStations);
router.post('/stations', createStation);
router.delete('/stations/:id', deleteStation);
router.get('/trains', getTrains);
router.post('/trains', createTrain);
router.delete('/trains/:id', deleteTrain);
router.post('/trains/:id/stops', addTrainStop);
router.delete('/trains/:id/stops/:stopId', deleteTrainStop);
router.get('/notices', getTrainNotices);
router.post('/notices', createTrainNotice);

export default router;
