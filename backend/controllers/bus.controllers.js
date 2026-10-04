import { Bus } from '../modules/bus.modules.js';
import { Route } from '../modules/route.modules.js';
import { shedulle } from '../modules/shedulle.modules.js';

export async function getBuses(req, res) {
    try {
        const buses = await Bus.find().sort({ bus_number: 1 }).lean();
        res.status(200).json({ buses });
    } catch (error) {
        res.status(500).json({ message: 'Error loading buses.', error: error.message });
    }
}

export async function createBus(req, res) {
    try {
        const bus_number = String(req.body.bus_number || '').trim();
        const route_number = String(req.body.route_number || '').trim();
        const bus_type = String(req.body.bus_type || 'Normal').trim();
        if (!bus_number || !route_number) {
            return res.status(400).json({ message: 'Bus number and route are required.' });
        }
        if (!await Route.exists({ route_number })) {
            return res.status(400).json({ message: 'Choose an existing route for this bus.' });
        }
        const bus = await Bus.create({ bus_number, route_number, bus_type });
        res.status(201).json({ message: 'Bus registered successfully.', bus });
    } catch (error) {
        res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'That bus number is already registered.' : 'Error registering bus.', error: error.message });
    }
}

export async function updateBus(req, res) {
    try {
        const bus_number = String(req.body.bus_number || '').trim();
        const route_number = String(req.body.route_number || '').trim();
        const bus_type = String(req.body.bus_type || 'Normal').trim();
        if (!bus_number || !route_number) {
            return res.status(400).json({ message: 'Bus number and route are required.' });
        }
        const [bus, route] = await Promise.all([
            Bus.findById(req.params.id),
            Route.findOne({ route_number }),
        ]);
        if (!bus) return res.status(404).json({ message: 'Bus not found.' });
        if (!route) return res.status(400).json({ message: 'Choose an existing route for this bus.' });
        if ((route_number !== bus.route_number || bus_number !== bus.bus_number) && await shedulle.exists({ bus_number: bus.bus_number })) {
            return res.status(409).json({ message: 'This bus is assigned to an existing schedule and its number or route cannot be changed.' });
        }
        bus.bus_number = bus_number;
        bus.route_number = route_number;
        bus.bus_type = bus_type;
        await bus.save();
        res.status(200).json({ message: 'Bus updated successfully.', bus });
    } catch (error) {
        res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'That bus number is already registered.' : 'Error updating bus.', error: error.message });
    }
}

export async function deleteBus(req, res) {
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) return res.status(404).json({ message: 'Bus not found.' });
        if (await shedulle.exists({ bus_number: bus.bus_number })) {
            return res.status(409).json({ message: 'This bus has schedules. Remove those schedules before deleting it.' });
        }
        await bus.deleteOne();
        res.status(200).json({ message: 'Bus removed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing bus.', error: error.message });
    }
}