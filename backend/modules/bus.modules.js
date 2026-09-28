import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
    bus_number: { type: String, required: true, unique: true, trim: true },
    route_number: { type: String, required: true, trim: true },
    bus_type: { type: String, required: true, default: 'Normal' },
});

export const Bus = mongoose.model('Bus', busSchema);