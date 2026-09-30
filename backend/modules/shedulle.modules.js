import mongoose  from "mongoose";

const shedulleSchema = new mongoose.Schema({
    route_name : { type: String, required: true },
    route_number : { type: String, required: true },
    bus_number : { type: String, required: true },
    assign_driver : { type: String, required: true },
    departure_time : { type: String, required: true },
    arrival_time : { type: String, required: true },
    status : { type: String, required: true, default: 'on time' },
    bus_type : { type: String, required: true },
    price: { type: Number, default: 0 },
    pending_status: { type: String, default: null },
    pending_status_driver: { type: String, default: null },
    actual_departure_date: { type: String, default: '' },
    actual_departure_time: { type: String, default: '' },
    is_delayed: { type: Boolean, default: false },
    delay_minutes: { type: Number, default: 0 },
    delay_reason: { type: String, default: '' },
    other_delay_reason: { type: String, default: '' },
});

export const shedulle = mongoose.model('Shedulle', shedulleSchema);