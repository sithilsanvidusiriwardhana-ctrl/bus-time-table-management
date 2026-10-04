import { Router } from 'express';
import {
    registerTaxiDriver,
    updateTaxiDriverStatus,
    getTaxiDriverProfile,
    getTaxiRequests,
    createTaxiRequest,
    submitDriverBid,
    deleteDriverBid,
    acceptDriverBid,
    deleteTaxiRequest,
    updateTaxiTripStatus,
    getTaxiDriversList
} from '../controllers/taxi.controllers.js';

const router = Router();

// Driver registration and profile
router.post('/register', registerTaxiDriver);
router.patch('/status', updateTaxiDriverStatus);
router.get('/profile/:username', getTaxiDriverProfile);
router.get('/drivers', getTaxiDriversList);

// Taxi ride requests
router.get('/requests', getTaxiRequests);
router.post('/requests', createTaxiRequest);
router.delete('/requests/:id', deleteTaxiRequest);
router.patch('/requests/:id/status', updateTaxiTripStatus);

// Bids / Quotes from drivers
router.post('/requests/:id/bid', submitDriverBid);
router.delete('/requests/:id/bid/:driverUsername', deleteDriverBid);
router.post('/requests/:id/accept-bid', acceptDriverBid);

export default router;
