import mongoose, { Schema } from 'mongoose';

const passengerSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 6,
    },
    role: {
        type: String,
        enum: ['admin', 'driver', 'passenger'],
        default: 'passenger',
    }
});

export const Passenger = mongoose.model('Passenger', passengerSchema);
