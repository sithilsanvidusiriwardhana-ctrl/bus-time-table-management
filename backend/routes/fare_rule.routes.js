import { Router } from 'express';
import {
    getFareRules,
    createFareRule,
    updateFareRule,
    deleteFareRule,
    batchUpdateFareRules,
} from '../controllers/fare_rule.controllers.js';

const router = Router();

router.get('/', getFareRules);
router.post('/', createFareRule);
router.post('/batch', batchUpdateFareRules);
router.put('/:id', updateFareRule);
router.delete('/:id', deleteFareRule);

export default router;
