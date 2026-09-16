import { Passenger } from '../modules/passanger.modules.js';
import { driver } from '../modules/driver.modules.js';
import { user } from '../modules/user.modules.js';

function usernameQuery(username) {
    return { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
}

function normalizeRole(role, fallback) {
    const normalizedRole = String(role || '').trim().toLowerCase();
    const roles = {
        admin: 'Admin',
        driver: 'Driver',
        passenger: 'Passenger'
    };

    return roles[normalizedRole] || fallback;
}

export const loginUser = async (req, res) => {
    try {
        const username = String(req.body.username || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        const query = usernameQuery(username);
        const passenger = await Passenger.findOne({ username: query });
        const driverAccount = await driver.findOne({ username: query });
        const adminAccount = await user.findOne({ username: query });
        const account = passenger || driverAccount || adminAccount;

        if (!account || String(account.password) !== password) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const role = passenger
            ? normalizeRole(passenger.role, 'Passenger')
            : driverAccount
                ? 'Driver'
                : normalizeRole(account.role, 'Admin');
        return res.status(200).json({
            message: 'User logged in successfully.',
            user: {
                username: account.username,
                role,
                displayName: account.name || account.displayName || account.username
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error logging in user.', error: error.message });
    }
};