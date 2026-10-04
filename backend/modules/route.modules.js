import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
    section_number: { type: Number, required: true },
    section_name: { type: String, required: true, trim: true },
    distance_km: { type: Number, default: 0 },
}, { _id: false });

const routeSchema = new mongoose.Schema({
    route_number: { type: String, required: true, unique: true, trim: true },
    route_name: { type: String, required: true, trim: true },
    departure_times: { type: [String], default: [] },
    sections: { type: [sectionSchema], default: [] },
    custom_fares: { type: Map, of: Number, default: {} },
});

export const Route = mongoose.model('Route', routeSchema);