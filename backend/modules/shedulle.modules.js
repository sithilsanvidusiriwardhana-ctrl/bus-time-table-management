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
});

export const shedulle = mongoose.model('Shedulle', shedulleSchema);