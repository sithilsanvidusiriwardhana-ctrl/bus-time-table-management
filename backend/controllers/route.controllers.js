import { Route } from '../modules/route.modules.js';
import { Bus } from '../modules/bus.modules.js';
import { shedulle } from '../modules/shedulle.modules.js';

function normalizeRouteInput(body) {
    const departure_times = [...new Set((Array.isArray(body.departure_times) ? body.departure_times : [])
        .map((time) => String(time).trim())
        .filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)))].sort();

    let sections = [];
    if (Array.isArray(body.sections) && body.sections.length > 0) {
        sections = body.sections.map((s, idx) => ({
            section_number: Number(s.section_number ?? (idx + 1)),
            section_name: String(s.section_name || `section ${idx + 1}`).trim(),
            distance_km: Math.max(0, Number(s.distance_km || 0)),
        }));
    }

    const custom_fares = typeof body.custom_fares === 'object' && body.custom_fares !== null ? body.custom_fares : {};

    return {
        route_number: String(body.route_number || '').trim(),
        route_name: String(body.route_name || '').trim(),
        departure_times,
        sections,
        custom_fares,
    };
}

export async function getRoutes(req, res) {
    try {
        const routes = await Route.find().sort({ route_number: 1 }).lean();
        res.status(200).json({ routes });
    } catch (error) {
        res.status(500).json({ message: 'Error loading routes.', error: error.message });
    }
}

export async function createRoute(req, res) {
    try {
        const routeData = normalizeRouteInput(req.body);
        if (!routeData.route_number || !routeData.route_name || !routeData.departure_times.length) {
            return res.status(400).json({ message: 'Route number, route name, and at least one valid departure time are required.' });
        }

        // Provide 3 default sections if none provided, matching the section 1, 2, 3 fare table setup
        if (routeData.sections.length === 0) {
            routeData.sections = [
                { section_number: 1, section_name: 'section 1', distance_km: 0 },
                { section_number: 2, section_name: 'section 2', distance_km: 4 },
                { section_number: 3, section_name: 'section 3', distance_km: 8 },
            ];
        }

        const route = await Route.create(routeData);
        res.status(201).json({ message: 'Route created successfully.', route });
    } catch (error) {
        res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'That route number already exists.' : 'Error creating route.', error: error.message });
    }
}

export async function updateRoute(req, res) {
    try {
        const routeData = normalizeRouteInput(req.body);
        if (!routeData.route_number || !routeData.route_name || !routeData.departure_times.length) {
            return res.status(400).json({ message: 'Route number, route name, and at least one valid departure time are required.' });
        }
        const currentRoute = await Route.findById(req.params.id);
        if (!currentRoute) return res.status(404).json({ message: 'Route not found.' });
        if (routeData.route_number !== currentRoute.route_number) {
            const [busExists, scheduleExists] = await Promise.all([
                Bus.exists({ route_number: currentRoute.route_number }),
                shedulle.exists({ route_number: currentRoute.route_number }),
            ]);
            if (busExists || scheduleExists) {
                return res.status(409).json({ message: 'Route number cannot change while buses or schedules use this route.' });
            }
        }
        const removedDepartureTimes = currentRoute.departure_times.filter(
            (time) => !routeData.departure_times.includes(time)
        );
        const schedulesAtRemovedTimes = removedDepartureTimes.length && await shedulle.exists({
            route_number: currentRoute.route_number,
            departure_time: { $in: removedDepartureTimes },
        });
        if (schedulesAtRemovedTimes) {
            return res.status(409).json({ message: 'Remove schedules using departure times before removing those times from this timetable.' });
        }
        const routeNumberBeforeUpdate = currentRoute.route_number;
        const routeNameBeforeUpdate = currentRoute.route_name;

        currentRoute.route_number = routeData.route_number;
        currentRoute.route_name = routeData.route_name;
        currentRoute.departure_times = routeData.departure_times;
        if (routeData.sections && routeData.sections.length > 0) {
            currentRoute.sections = routeData.sections;
        }
        if (routeData.custom_fares && Object.keys(routeData.custom_fares).length > 0) {
            currentRoute.custom_fares = routeData.custom_fares;
        }

        await currentRoute.save();
        if (routeData.route_name !== routeNameBeforeUpdate || routeData.route_number !== routeNumberBeforeUpdate) {
            await shedulle.updateMany(
                { route_number: routeNumberBeforeUpdate },
                { route_name: routeData.route_name, route_number: routeData.route_number }
            );
        }
        res.status(200).json({ message: 'Route updated successfully.', route: currentRoute });
    } catch (error) {
        res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'That route number already exists.' : 'Error updating route.', error: error.message });
    }
}

export async function updateRouteSections(req, res) {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) return res.status(404).json({ message: 'Route not found.' });

        const { sections, custom_fares } = req.body;
        if (Array.isArray(sections)) {
            route.sections = sections.map((s, idx) => ({
                section_number: Number(s.section_number ?? (idx + 1)),
                section_name: String(s.section_name || `section ${idx + 1}`).trim(),
                distance_km: Math.max(0, Number(s.distance_km || 0)),
            }));
        }
        if (custom_fares && typeof custom_fares === 'object') {
            route.custom_fares = custom_fares;
        }

        await route.save();
        res.status(200).json({ message: 'Route sections and prices saved successfully.', route });
    } catch (error) {
        res.status(500).json({ message: 'Error updating route sections and prices.', error: error.message });
    }
}

export async function deleteRoute(req, res) {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) return res.status(404).json({ message: 'Route not found.' });
        const [busExists, scheduleExists] = await Promise.all([
            Bus.exists({ route_number: route.route_number }),
            shedulle.exists({ route_number: route.route_number }),
        ]);
        if (busExists || scheduleExists) {
            return res.status(409).json({ message: 'Remove buses and schedules assigned to this route before deleting it.' });
        }
        await route.deleteOne();
        res.status(200).json({ message: 'Route deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting route.', error: error.message });
    }
}