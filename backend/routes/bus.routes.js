import { Router } from 'express';
import { createBus, deleteBus, getBuses, updateBus } from '../controllers/bus.controllers.js';

const router = Router();
router.get('/', getBuses);
router.post('/', createBus);
router.put('/:id', updateBus);
router.delete('/:id', deleteBus);

export default router;