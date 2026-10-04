import { Passenger } from '../modules/passanger.modules.js';
import { driver } from '../modules/driver.modules.js';
import { user } from '../modules/user.modules.js';
import { getTrainMasterModel } from '../modules/train.modules.js';
import { TaxiDriver } from '../modules/taxi.modules.js';

function usernameQuery(username) {
    return { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
}

function normalizeRole(role, fallback) {
    const normalizedRole = String(role || '').trim().toLowerCase();
    const roles = {
        admin: 'Admin',
        driver: 'Driver',
        passenger: 'Passenger',
        'train master': 'Train Master',
        'taxi driver': 'Taxi Driver',
        taxi: 'Taxi Driver'
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
        const taxiDriverAccount = await TaxiDriver.findOne({ username: query });
        const TrainMaster = getTrainMasterModel();
        // Train-master accounts are entered manually, so accept the common
        // username field variants used in MongoDB documents.
        const trainMasterAccount = await TrainMaster.collection.findOne({
            $or: [{ username: query }, { user_name: query }, { userName: query }]
        });
        const account = passenger || driverAccount || adminAccount || trainMasterAccount || taxiDriverAccount;

        const storedPassword = account?.password ?? account?.Password ?? '';
        if (!account || String(storedPassword) !== password) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const role = taxiDriverAccount
            ? 'Taxi Driver'
            : passenger
                ? normalizeRole(passenger.role, 'Passenger')
                : driverAccount
                    ? 'Driver'
                    : trainMasterAccount
                        ? 'Train Master'
                        : normalizeRole(account.role, 'Admin');
        return res.status(200).json({
            message: 'User logged in successfully.',
            user: {
                username: account.username || account.user_name || account.userName,
                role,
                displayName: account.name || account.displayName || account.full_name || account.username || account.user_name || account.userName,
                telephone: account.telephone || '',
                vehicleType: account.vehicleType || '',
                vehicleNumber: account.vehicleNumber || '',
                isOnline: account.isOnline || false
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error logging in user.', error: error.message });
    }
};
