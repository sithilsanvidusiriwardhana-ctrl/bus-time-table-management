import { driver } from '../modules/driver.modules.js';

export const getDrivers = async (req, res) => {
    try {
        const drivers = await driver.find({}, { password: 0 }).sort({ name: 1 }).lean();
        res.status(200).json({ drivers });
    } catch (error) {
        res.status(500).json({ message: 'Error loading drivers.', error: error.message });
    }
};

export const registerDriver = async (req, res) => {
    try {
        const { name, username, password } = req.body;
        if(!name || !username || !password) {
            return res.status(400).json({ message: 'Name, username, and password are required.' });
        }
        const existingDriver = await driver.findOne({ username: username });
        if(existingDriver) {
            return res.status(409).json({ message: 'Driver with this username already exists.' });
        }
        const newDriver = await driver.create({ name, username, password });
        res.status(201).json({ message: 'Driver registered successfully.', driver: newDriver });
    } catch (error) {
        res.status(500).json({ message: 'Error registering driver.', error: error.message });
    }
};

export const deleteDriver = async (req, res) => {
    try {
        const username = String(req.params.username || '').trim();
        if (!username) {
            return res.status(400).json({ message: 'Driver username is required.' });
        }

        const deletedDriver = await driver.findOneAndDelete({
            username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });
        if (!deletedDriver) {
            return res.status(404).json({ message: 'Driver account not found.' });
        }

        res.status(200).json({ message: 'Driver account removed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing driver account.', error: error.message });
    }
};