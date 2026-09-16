import mongoose  from "mongoose";

const driverSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

export const driver = mongoose.model('Driver', driverSchema);