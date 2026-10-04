import {shedulle} from '../modules/shedulle.modules.js';
import {Route} from '../modules/route.modules.js';
import {Bus} from '../modules/bus.modules.js';
import { getDepartureLogModel } from '../modules/departureLog.modules.js';

async function validateScheduleRoute({ route_number, bus_number, departure_time }) {
    const route = await Route.findOne({ route_number: String(route_number || '').trim() });
    if (!route) return 'Choose a registered route.';
    const bus = await Bus.findOne({
        bus_number: String(bus_number || '').trim(),
        route_number: route.route_number,
    });
    if (!bus) return 'Choose a bus registered to this route.';
    if (!route.departure_times.includes(String(departure_time || '').trim())) {
        return 'Choose a departure time listed for this route.';
    }
    return null;
}

function getDepartureDetails(body) {
    const is_delayed = body.is_delayed === true || body.is_delayed === 'true';
    const delay_minutes = Number(body.delay_minutes);
    return {
        actual_departure_date: String(body.actual_departure_date || '').trim(),
        actual_departure_time: String(body.actual_departure_time || '').trim(),
        is_delayed,
        delay_minutes: is_delayed && Number.isFinite(delay_minutes) ? delay_minutes : 0,
        delay_reason: is_delayed ? String(body.delay_reason || '').trim() : '',
        other_delay_reason: is_delayed ? String(body.other_delay_reason || '').trim() : '',
    };
}

function validateDepartureDetails(details) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(details.actual_departure_date) || !/^\d{2}:\d{2}$/.test(details.actual_departure_time)) {
        return 'Enter a valid departure date and time.';
    }
    if (!details.is_delayed) return null;
    if (!Number.isInteger(details.delay_minutes) || details.delay_minutes < 1) {
        return 'Enter the delay duration in minutes.';
    }
    if (!['traffic', 'slow_driving', 'accident', 'breakdown', 'other'].includes(details.delay_reason)) {
        return 'Choose a reason for the delay.';
    }
    if (details.delay_reason === 'other' && !details.other_delay_reason) {
        return 'Enter the other reason for the delay.';
    }
    return null;
}

// Departure details are operational history, not timetable data.
async function saveDepartureLog(schedule, details, adminUsername = 'admin') {
    const DepartureLog = getDepartureLogModel();
    return DepartureLog.create({
        schedule_id: String(schedule._id),
        bus_number: schedule.bus_number || '',
        route_name: schedule.route_name || '',
        route_number: schedule.route_number || '',
        admin_username: adminUsername || 'admin',
        ...details,
    });
}

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
        const routeError = await validateScheduleRoute({ route_number, bus_number, departure_time });
        if (routeError) return res.status(400).json({ message: routeError });
        const departureDetails = String(status).toLowerCase() === 'departed' ? getDepartureDetails(req.body) : {};
        if (String(status).toLowerCase() === 'departed') {
            const departureError = validateDepartureDetails(departureDetails);
            if (departureError) return res.status(400).json({ message: departureError });
        }
        const newShedulle = await shedulle.create({ bus_number, route_name, route_number, assign_driver, departure_time, arrival_time, status, bus_type, price });
        if (String(status).toLowerCase() === 'departed') {
            await saveDepartureLog(newShedulle, departureDetails, req.body.admin_username);
        }
        res.status(201).json({ message: 'Shedulle registered successfully.', shedulle: newShedulle });
    } catch (error) {
        res.status(500).json({ message: 'Error registering shedulle.', error: error.message });
    }
}; 

export const updateShedulle = async (req, res) => {
    try {
        const { bus_number, route_name, route_number, assign_driver, departure_time, arrival_time, status, bus_type, price } = req.body;
        if(!bus_number || !route_name || !route_number || !assign_driver || !departure_time || !arrival_time || !status || !bus_type) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        const routeError = await validateScheduleRoute({ route_number, bus_number, departure_time });
        if (routeError) return res.status(400).json({ message: routeError });

        const departureDetails = String(status).toLowerCase() === 'departed' ? getDepartureDetails(req.body) : {};
        if (String(status).toLowerCase() === 'departed') {
            const departureError = validateDepartureDetails(departureDetails);
            if (departureError) return res.status(400).json({ message: departureError });
        }

        const updatedSchedule = await shedulle.findByIdAndUpdate(
            req.params.id,
            { bus_number, route_name, route_number, assign_driver, departure_time, arrival_time, status, bus_type, price },
            { new: true, runValidators: true }
        );
        if (!updatedSchedule) {
            return res.status(404).json({ message: 'Schedule not found.' });
        }
        if (String(status).toLowerCase() === 'departed') {
            await saveDepartureLog(updatedSchedule, departureDetails, req.body.admin_username);
        }
        res.status(200).json({ message: 'Schedule updated successfully.', shedulle: updatedSchedule });
    } catch (error) {
        res.status(500).json({ message: 'Error updating schedule.', error: error.message });
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
            { returnDocument: 'after' }
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

        // Build the update object for findByIdAndUpdate
        const updateFields = {
            status: schedule.pending_status,
            pending_status: null,
            pending_status_driver: null,
        };

        if (String(schedule.pending_status).toLowerCase() === 'departed') {
            const details = getDepartureDetails(req.body || {});
            const departureError = validateDepartureDetails(details);
            if (departureError) return res.status(400).json({ message: departureError });

            // Save the detailed departure record separately from the schedule.
            const savedLog = await saveDepartureLog(schedule, details, req.body.admin_username);
            console.log('Departure log saved to departure_logs, id:', savedLog._id);
        }

        // Only the schedule status is updated here; departure details stay in departure_logs.
        const updated = await shedulle.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { returnDocument: 'after', runValidators: false }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Schedule not found.' });
        }

        res.status(200).json({ message: 'Status approved and updated.', shedulle: updated });
    } catch (error) {
        console.error('❌ approveStatusUpdate error:', error.message);
        res.status(500).json({ message: 'Error approving status update.', error: error.message });
    }
};
