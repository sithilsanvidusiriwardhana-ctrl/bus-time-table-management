import { Router } from 'express';
import {approveStatusUpdate, deleteShedulle, getShedulles, registerShedulle, requestStatusUpdate} from '../controllers/shedulle.controllers.js';

const router = Router();

// This handles POST requests to /api/shedulle/register
router.get('/', getShedulles);
router.post('/register', registerShedulle);
router.delete('/:id', deleteShedulle);
router.post('/:id/status-request', requestStatusUpdate);
router.post('/:id/status-approve', approveStatusUpdate);

export default router;