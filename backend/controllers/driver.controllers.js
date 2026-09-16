import { driver } from '../modules/driver.modules.js';
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