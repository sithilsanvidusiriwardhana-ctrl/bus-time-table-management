import { getDepartureLogModel } from '../modules/departureLog.modules.js';

/**
 * POST /api/departure-logs
 * Body: { schedule_id, bus_number, route_name, route_number, admin_username,
 *         actual_departure_date, actual_departure_time,
 *         is_delayed, delay_minutes, delay_reason, other_delay_reason }
 */
export const createDepartureLog = async (req, res) => {
  try {
    const {
      schedule_id,
      bus_number,
      route_name,
      route_number,
      admin_username,
      actual_departure_date,
      actual_departure_time,
      is_delayed,
      delay_minutes,
      delay_reason,
      other_delay_reason,
    } = req.body;

    if (!schedule_id || !bus_number || !actual_departure_date || !actual_departure_time) {
      return res.status(400).json({
        message: 'schedule_id, bus_number, actual_departure_date and actual_departure_time are required.',
      });
    }

    const DepartureLog = getDepartureLogModel();
    const log = await DepartureLog.create({
      schedule_id,
      bus_number,
      route_name: route_name || '',
      route_number: route_number || '',
      admin_username: admin_username || 'admin',
      actual_departure_date,
      actual_departure_time,
      is_delayed: Boolean(is_delayed),
      delay_minutes: Number(delay_minutes) || 0,
      delay_reason: delay_reason || '',
      other_delay_reason: other_delay_reason || '',
    });

    res.status(201).json({ message: 'Departure log saved successfully.', log });
  } catch (error) {
    console.error('Error saving departure log:', error);
    res.status(500).json({ message: 'Error saving departure log.', error: error.message });
  }
};

/**
 * GET /api/departure-logs
 * Returns all departure logs sorted newest-first.
 */
export const getDepartureLogs = async (req, res) => {
  try {
    const DepartureLog = getDepartureLogModel();
    const logs = await DepartureLog.find().sort({ recorded_at: -1 }).lean();
    res.status(200).json({ logs });
  } catch (error) {
    console.error('Error loading departure logs:', error);
    res.status(500).json({ message: 'Error loading departure logs.', error: error.message });
  }
};

/**
 * GET /api/departure-logs/:scheduleId
 * Returns all departure logs for a specific schedule.
 */
export const getDepartureLogsBySchedule = async (req, res) => {
  try {
    const DepartureLog = getDepartureLogModel();
    const logs = await DepartureLog
      .find({ schedule_id: req.params.scheduleId })
      .sort({ recorded_at: -1 })
      .lean();
    res.status(200).json({ logs });
  } catch (error) {
    console.error('Error loading departure logs for schedule:', error);
    res.status(500).json({ message: 'Error loading departure logs.', error: error.message });
  }
};
