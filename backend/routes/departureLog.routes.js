import { Router } from 'express';
import {
  createDepartureLog,
  getDepartureLogs,
  getDepartureLogsBySchedule,
} from '../controllers/departureLog.controllers.js';

const router = Router();

router.get('/', getDepartureLogs);
router.get('/:scheduleId', getDepartureLogsBySchedule);
router.post('/', createDepartureLog);

export default router;
