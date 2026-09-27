import { Passenger } from "../modules/passanger.modules.js";

export const registerPassenger = async (req, res) => {
    try {
        const { name, username, password } = req.body;
        if (!name || !username || !password) {
            return res.status(400).json({ message: 'Name, username, and password are required.' });
        }
        const existingPassenger = await Passenger.findOne({ username: username });
        if (existingPassenger) {
            return res.status(409).json({ message: 'Passenger with this username already exists.' });
        }

        const newPassenger = await Passenger.create({ name, username, password });
        res.status(201).json({ message: 'Passenger registered successfully.', passenger: newPassenger });
    } catch (error) {
        res.status(500).json({ message: 'Error registering passenger.', error: error.message });
    }
};