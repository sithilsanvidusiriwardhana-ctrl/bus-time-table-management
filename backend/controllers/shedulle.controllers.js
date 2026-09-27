import {shedulle} from '../modules/shedulle.modules.js';

export const getShedulles = async (req, res) => {
    try {
        const shedulles = await shedulle.find().sort({ route_number: 1, departure_time: 1 }).lean();
        res.status(200).json({ shedulles });
    } catch (error) {
        res.status(500).json({ message: 'Error loading shedulles.', error: error.message });
    }
};

export const registerShedulle = async (req, res) => {
    try {
        const { bus_number, route_name, route_number, assign_driver, departure_time, arrival_time, status, bus_type, price } = req.body;
        if(!bus_number || !route_name || !route_number || !assign_driver || !departure_time || !arrival_time || !status || !bus_type) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
    const newShedulle = await shedulle.create({ bus_number, route_name, route_number, assign_driver, departure_time, arrival_time, status, bus_type, price });
        res.status(201).json({ message: 'Shedulle registered successfully.', shedulle: newShedulle });
    } catch (error) {
        res.status(500).json({ message: 'Error registering shedulle.', error: error.message });
    }
}; 

export const deleteShedulle = async (req, res) => {
    try {
        const deletedSchedule = await shedulle.findByIdAndDelete(req.params.id);
        if (!deletedSchedule) {
            return res.status(404).json({ message: 'Schedule not found.' });
        }
        res.status(200).json({ message: 'Schedule removed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing schedule.', error: error.message });
    }
};

export const requestStatusUpdate = async (req, res) => {
    try {
        const { status, driver_username } = req.body;
        if (!status || !driver_username) {
            return res.status(400).json({ message: 'Status and driver username are required.' });
        }

        const schedule = await shedulle.findByIdAndUpdate(
            req.params.id,
            { pending_status: status, pending_status_driver: driver_username },
            { new: true }
        ).lean();
        if (!schedule) return res.status(404).json({ message: 'Schedule not found.' });
        res.status(200).json({ message: 'Status sent for admin approval.', shedulle: schedule });
    } catch (error) {
        res.status(500).json({ message: 'Error requesting status update.', error: error.message });
    }
};

export const approveStatusUpdate = async (req, res) => {
    try {
        const schedule = await shedulle.findById(req.params.id);
        if (!schedule || !schedule.pending_status) {
            return res.status(404).json({ message: 'No pending status update found.' });
        }

        schedule.status = schedule.pending_status;
        schedule.pending_status = null;
        schedule.pending_status_driver = null;
        await schedule.save();
        res.status(200).json({ message: 'Status approved and updated.', shedulle: schedule });
    } catch (error) {
        res.status(500).json({ message: 'Error approving status update.', error: error.message });
    }
};