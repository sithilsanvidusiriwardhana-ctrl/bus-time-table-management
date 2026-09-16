import mangooes from "mongoose";

const userSchema = new mangooes.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, default: 'Administrator' },
    role: { type: String, enum: ['Admin', 'Driver', 'Passenger'], default: 'Admin' },
}, { collection: 'admin' });

export const user = mangooes.model('User', userSchema);