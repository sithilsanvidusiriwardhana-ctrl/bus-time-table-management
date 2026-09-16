import {Router} from 'express';
import { registerDriver } from '../controllers/driver.controllers.js';
const driver_router = Router();

// This handles POST requests to /api/drivers/register
driver_router.post('/register', registerDriver);
export default driver_router;