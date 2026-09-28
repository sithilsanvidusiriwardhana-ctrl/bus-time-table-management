import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
    route_number: { type: String, required: true, unique: true, trim: true },
    route_name: { type: String, required: true, trim: true },
    departure_times: { type: [String], default: [] },
});

export const Route = mongoose.model('Route', routeSchema);