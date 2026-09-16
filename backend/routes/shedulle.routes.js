import { Router } from 'express';
import {registerShedulle} from '../controllers/shedulle.controllers.js';

const router = Router();

// This handles POST requests to /api/shedulle/register
router.post('/register', registerShedulle);

export default router;