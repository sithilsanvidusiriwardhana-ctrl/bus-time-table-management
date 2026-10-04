import mongoose, { Schema } from 'mongoose';

const taxiDriverSchema = new Schema({
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
        minlength: 4,
    },
    telephone: {
        type: String,
        default: '',
        trim: true,
    },
    vehicleType: {
        type: String,
        enum: ['Car', 'Tuk Tuk', 'Van', 'SUV', 'Motorbike'],
        default: 'Car',
    },
    vehicleNumber: {
        type: String,
        default: '',
        trim: true,
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        default: 'Taxi Driver',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const bidSchema = new Schema({
    driverUsername: {
        type: String,
        required: true,
    },
    driverName: {
        type: String,
        required: true,
    },
    driverPhone: {
        type: String,
        default: '',
    },
    vehicleType: {
        type: String,
        default: 'Car',
    },
    vehicleNumber: {
        type: String,
        default: '',
    },
    budget: {
        type: Number,
        required: true,
    },
    note: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Declined'],
        default: 'Pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const taxiRequestSchema = new Schema({
    passengerUsername: {
        type: String,
        required: true,
        trim: true,
    },
    passengerName: {
        type: String,
        required: true,
        trim: true,
    },
    passengerPhone: {
        type: String,
        default: '',
    },
    pickupLocation: {
        type: String,
        required: true,
        trim: true,
    },
    pickupCoordinates: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 },
    },
    destination: {
        type: String,
        required: true,
        trim: true,
    },
    destinationCoordinates: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 },
    },
    vehiclePreference: {
        type: String,
        default: 'Any',
    },
    passengerNotes: {
        type: String,
        default: '',
    },
    passengerBudget: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['Open', 'Accepted', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Open',
    },
    bids: [bidSchema],
    selectedDriver: {
        driverUsername: String,
        driverName: String,
        driverPhone: String,
        vehicleType: String,
        vehicleNumber: String,
        agreedBudget: Number,
        acceptedAt: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

export const TaxiDriver = mongoose.models.TaxiDriver || mongoose.model('TaxiDriver', taxiDriverSchema);
export const TaxiRequest = mongoose.models.TaxiRequest || mongoose.model('TaxiRequest', taxiRequestSchema);
