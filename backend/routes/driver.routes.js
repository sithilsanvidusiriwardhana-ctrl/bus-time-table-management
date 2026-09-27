import {Router} from 'express';
import { deleteDriver, getDrivers, registerDriver } from '../controllers/driver.controllers.js';
const driver_router = Router();

driver_router.get('/', getDrivers);

// This handles POST requests to /api/drivers/register
driver_router.post('/register', registerDriver);
driver_router.delete('/:username', deleteDriver);
export default driver_router;