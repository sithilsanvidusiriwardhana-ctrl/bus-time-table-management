import { TaxiDriver, TaxiRequest } from '../modules/taxi.modules.js';
import { Passenger } from '../modules/passanger.modules.js';
import { driver } from '../modules/driver.modules.js';
import { user } from '../modules/user.modules.js';

// Helper to escape regex
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Register a new Taxi Driver
export const registerTaxiDriver = async (req, res) => {
    try {
        const { name, username, password, telephone, vehicleType, vehicleNumber } = req.body;

        if (!name || !username || !password) {
            return res.status(400).json({ message: 'Name, username, and password are required.' });
        }

        const trimmedUsername = String(username).trim().toLowerCase();
        const usernameQuery = { $regex: `^${escapeRegex(trimmedUsername)}$`, $options: 'i' };

        // Check uniqueness across collections
        const [existingTaxi, existingPassenger, existingDriver, existingAdmin] = await Promise.all([
            TaxiDriver.findOne({ username: usernameQuery }),
            Passenger.findOne({ username: usernameQuery }),
            driver.findOne({ username: usernameQuery }),
            user.findOne({ username: usernameQuery })
        ]);

        if (existingTaxi || existingPassenger || existingDriver || existingAdmin) {
            return res.status(409).json({ message: 'Username is already taken. Please choose another.' });
        }

        const newDriver = await TaxiDriver.create({
            name: String(name).trim(),
            username: trimmedUsername,
            password: String(password).trim(),
            telephone: String(telephone || '').trim(),
            vehicleType: vehicleType || 'Car',
            vehicleNumber: String(vehicleNumber || '').trim(),
            isOnline: false,
            role: 'Taxi Driver'
        });

        res.status(201).json({
            message: 'Taxi Driver registered successfully.',
            driver: {
                name: newDriver.name,
                username: newDriver.username,
                role: 'Taxi Driver',
                telephone: newDriver.telephone,
                vehicleType: newDriver.vehicleType,
                vehicleNumber: newDriver.vehicleNumber,
                isOnline: newDriver.isOnline
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error registering taxi driver.', error: error.message });
    }
};

// Update online/offline switch
export const updateTaxiDriverStatus = async (req, res) => {
    try {
        const { username, isOnline } = req.body;
        if (!username) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        const trimmed = String(username).trim().toLowerCase();
        const updated = await TaxiDriver.findOneAndUpdate(
            { username: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' } },
            { isOnline: Boolean(isOnline) },
            { returnDocument: 'after' }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Taxi driver not found.' });
        }

        res.status(200).json({
            message: `Status updated to ${updated.isOnline ? 'Online' : 'Offline'}.`,
            isOnline: updated.isOnline
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating driver status.', error: error.message });
    }
};

// Get Driver Profile
export const getTaxiDriverProfile = async (req, res) => {
    try {
        const username = String(req.params.username || '').trim().toLowerCase();
        const driverDoc = await TaxiDriver.findOne(
            { username: { $regex: `^${escapeRegex(username)}$`, $options: 'i' } },
            { password: 0 }
        );

        if (!driverDoc) {
            return res.status(404).json({ message: 'Taxi driver not found.' });
        }

        res.status(200).json({ driver: driverDoc });
    } catch (error) {
        res.status(500).json({ message: 'Error getting profile.', error: error.message });
    }
};

// Get registered taxi drivers list (with online status)
export const getTaxiDriversList = async (req, res) => {
    try {
        const { onlineOnly } = req.query;
        const filter = onlineOnly === 'true' ? { isOnline: true } : {};
        const drivers = await TaxiDriver.find(filter, { password: 0 }).sort({ isOnline: -1, name: 1 });
        res.status(200).json({ drivers });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching taxi drivers.', error: error.message });
    }
};

// Get Taxi Requests (with filtering)
export const getTaxiRequests = async (req, res) => {
    try {
        const { status, passengerUsername, driverUsername } = req.query;
        let query = {};

        if (passengerUsername) {
            // Passenger fetches their own requests (all statuses)
            query.passengerUsername = { $regex: `^${escapeRegex(String(passengerUsername).trim())}$`, $options: 'i' };
            query.status = { $in: ['Open', 'Accepted', 'In Progress', 'Completed'] };
        } else if (driverUsername) {
            // Driver fetches their own active/completed trips (where they are the selected driver)
            const uname = String(driverUsername).trim().toLowerCase();
            query['selectedDriver.driverUsername'] = { $regex: `^${escapeRegex(uname)}$`, $options: 'i' };
            query.status = { $in: ['Accepted', 'In Progress', 'Completed'] };
        } else if (status) {
            query.status = status;
        } else {
            // Default: available feed — only Open requests (not yet accepted by anyone)
            query.status = 'Open';
        }

        const requests = await TaxiRequest.find(query).sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ requests });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching taxi requests.', error: error.message });
    }
};

// Passenger creates a new ride request or direct booking
export const createTaxiRequest = async (req, res) => {
    try {
        const {
            passengerUsername,
            passengerName,
            passengerPhone,
            pickupLocation,
            pickupCoordinates,
            destination,
            destinationCoordinates,
            vehiclePreference,
            passengerNotes,
            passengerBudget,
            directDriver
        } = req.body;

        if (!passengerUsername || !pickupLocation || !destination) {
            return res.status(400).json({ message: 'Pickup location and destination are required.' });
        }

        let validatedPickupCoordinates;
        if (pickupCoordinates !== undefined && pickupCoordinates !== null) {
            const lat = Number(pickupCoordinates.lat);
            const lng = Number(pickupCoordinates.lng);
            if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
                return res.status(400).json({ message: 'Pickup coordinates must contain a valid latitude and longitude.' });
            }
            validatedPickupCoordinates = { lat, lng };
        }

        let validatedDestinationCoordinates;
        if (destinationCoordinates !== undefined && destinationCoordinates !== null) {
            const lat = Number(destinationCoordinates.lat);
            const lng = Number(destinationCoordinates.lng);
            if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
                return res.status(400).json({ message: 'Drop-off coordinates must contain a valid latitude and longitude.' });
            }
            validatedDestinationCoordinates = { lat, lng };
        }

        const isDirect = Boolean(directDriver && directDriver.driverUsername);
        const agreedFare = Number(directDriver?.agreedBudget || passengerBudget || 0);

        const newRequest = await TaxiRequest.create({
            passengerUsername: String(passengerUsername).trim(),
            passengerName: String(passengerName || passengerUsername).trim(),
            passengerPhone: String(passengerPhone || '').trim(),
            pickupLocation: String(pickupLocation).trim(),
            pickupCoordinates: validatedPickupCoordinates,
            destination: String(destination).trim(),
            destinationCoordinates: validatedDestinationCoordinates,
            vehiclePreference: vehiclePreference || directDriver?.vehicleType || 'Any',
            passengerNotes: String(passengerNotes || '').trim(),
            passengerBudget: agreedFare,
            status: isDirect ? 'Accepted' : 'Open',
            selectedDriver: isDirect ? {
                driverUsername: String(directDriver.driverUsername).trim(),
                driverName: String(directDriver.driverName || directDriver.driverUsername).trim(),
                driverPhone: String(directDriver.driverPhone || '').trim(),
                vehicleType: directDriver.vehicleType || 'Car',
                vehicleNumber: String(directDriver.vehicleNumber || '').trim(),
                agreedBudget: agreedFare,
                acceptedAt: new Date()
            } : undefined,
            bids: isDirect ? [{
                driverUsername: String(directDriver.driverUsername).trim(),
                driverName: String(directDriver.driverName || directDriver.driverUsername).trim(),
                driverPhone: String(directDriver.driverPhone || '').trim(),
                vehicleType: directDriver.vehicleType || 'Car',
                vehicleNumber: String(directDriver.vehicleNumber || '').trim(),
                budget: agreedFare,
                note: 'Direct booking',
                status: 'Accepted',
                createdAt: new Date()
            }] : []
        });

        res.status(201).json({
            message: isDirect
                ? `Taxi ride booked & confirmed with ${directDriver.driverName || directDriver.driverUsername}! Driver is notified.`
                : 'Taxi request created successfully! Waiting for driver quotes.',
            request: newRequest
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating taxi request.', error: error.message });
    }
};

// Taxi driver submits / updates a budget quote ("give money taxi")
export const submitDriverBid = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            driverUsername,
            driverName,
            driverPhone,
            vehicleType,
            vehicleNumber,
            budget,
            note
        } = req.body;

        if (!driverUsername || budget === undefined || budget === null || Number(budget) <= 0) {
            return res.status(400).json({ message: 'Driver username and a valid budget quote are required.' });
        }

        const request = await TaxiRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Taxi request not found.' });
        }

        if (request.status !== 'Open') {
            return res.status(400).json({ message: `Cannot submit quote. Request is currently ${request.status}.` });
        }

        // Check if driver already bid
        const existingBidIndex = request.bids.findIndex(
            (b) => b.driverUsername.toLowerCase() === driverUsername.toLowerCase()
        );

        const bidData = {
            driverUsername: String(driverUsername).trim(),
            driverName: String(driverName || driverUsername).trim(),
            driverPhone: String(driverPhone || '').trim(),
            vehicleType: vehicleType || 'Car',
            vehicleNumber: String(vehicleNumber || '').trim(),
            budget: Number(budget),
            note: String(note || '').trim(),
            status: 'Pending',
            createdAt: new Date()
        };

        if (existingBidIndex >= 0) {
            request.bids[existingBidIndex] = bidData;
        } else {
            request.bids.push(bidData);
        }

        request.updatedAt = new Date();
        await request.save();

        res.status(200).json({
            message: 'Budget quote submitted to passenger successfully!',
            request
        });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting budget quote.', error: error.message });
    }
};

// Delete a driver's quote / bid (either driver withdraws or passenger removes it)
export const deleteDriverBid = async (req, res) => {
    try {
        const { id, driverUsername } = req.params;
        const request = await TaxiRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Taxi request not found.' });
        }

        request.bids = request.bids.filter(
            (b) => b.driverUsername.toLowerCase() !== String(driverUsername).trim().toLowerCase()
        );
        request.updatedAt = new Date();
        await request.save();

        res.status(200).json({
            message: 'Quote removed successfully.',
            request
        });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quote.', error: error.message });
    }
};

// Passenger accepts a driver's budget quote
export const acceptDriverBid = async (req, res) => {
    try {
        const { id } = req.params;
        const { driverUsername } = req.body;

        if (!driverUsername) {
            return res.status(400).json({ message: 'Driver username is required to accept quote.' });
        }

        const request = await TaxiRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Taxi request not found.' });
        }

        if (request.status !== 'Open') {
            return res.status(400).json({ message: `Request is already ${request.status}.` });
        }

        const chosenBid = request.bids.find(
            (b) => b.driverUsername.toLowerCase() === String(driverUsername).trim().toLowerCase()
        );

        if (!chosenBid) {
            return res.status(404).json({ message: 'Quote from this driver was not found.' });
        }

        // Mark bids
        request.bids.forEach((bid) => {
            if (bid.driverUsername.toLowerCase() === String(driverUsername).trim().toLowerCase()) {
                bid.status = 'Accepted';
            } else {
                bid.status = 'Declined';
            }
        });

        request.status = 'Accepted';
        request.selectedDriver = {
            driverUsername: chosenBid.driverUsername,
            driverName: chosenBid.driverName,
            driverPhone: chosenBid.driverPhone,
            vehicleType: chosenBid.vehicleType,
            vehicleNumber: chosenBid.vehicleNumber,
            agreedBudget: chosenBid.budget,
            acceptedAt: new Date()
        };
        request.updatedAt = new Date();

        await request.save();

        res.status(200).json({
            message: `Taxi offer of LKR ${chosenBid.budget} accepted! Ride is confirmed.`,
            request
        });
    } catch (error) {
        res.status(500).json({ message: 'Error accepting quote.', error: error.message });
    }
};

// Cancel/Delete ride request
export const deleteTaxiRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TaxiRequest.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Taxi request not found.' });
        }

        res.status(200).json({ message: 'Taxi request cancelled and removed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting taxi request.', error: error.message });
    }
};

// Update Trip Status (e.g. In Progress, Completed, Cancelled)
export const updateTaxiTripStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Open', 'Accepted', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status.' });
        }

        const request = await TaxiRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Taxi request not found.' });
        }

        request.status = status;
        request.updatedAt = new Date();
        await request.save();

        res.status(200).json({
            message: `Trip status updated to ${status}.`,
            request
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating trip status.', error: error.message });
    }
};
