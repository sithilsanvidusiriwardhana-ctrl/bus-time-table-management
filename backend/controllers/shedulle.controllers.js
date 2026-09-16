import {shedulle} from '../modules/shedulle.modules.js';
export const registerShedulle = async (req, res) => {
    try {
        const { bus_number, route_name, route_number, assign_driver, departure_time, arrival_time, status, bus_type } = req.body;  
        if(!bus_number || !route_name || !route_number || !assign_driver || !departure_time || !arrival_time || !status || !bus_type) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
       const newShedulle = await shedulle.create({ bus_number, route_name, route_number, assign_driver, departure_time, arrival_time, status, bus_type });
        res.status(201).json({ message: 'Shedulle registered successfully.', shedulle: newShedulle });
    } catch (error) {
        res.status(500).json({ message: 'Error registering shedulle.', error: error.message });
    }
}; 