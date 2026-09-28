import { Router } from 'express';
import { createRoute, deleteRoute, getRoutes, updateRoute } from '../controllers/route.controllers.js';

const router = Router();
router.get('/', getRoutes);
router.post('/', createRoute);
router.put('/:id', updateRoute);
router.delete('/:id', deleteRoute);

export default router;