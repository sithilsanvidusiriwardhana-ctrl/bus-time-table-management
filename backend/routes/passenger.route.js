import { Router } from 'express';
import { registerPassenger } from '../controllers/passenger.controller.js';

const router = Router();

// This handles POST requests to /api/passengers/register
router.post('/register', registerPassenger);

export default router;