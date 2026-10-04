import mongoose from 'mongoose';

const fareRuleSchema = new mongoose.Schema({
    stage_number: { type: Number, required: true, unique: true },
    max_km: { type: Number, required: true },
    price: { type: Number, required: true },
});

export const FareRule = mongoose.model('FareRule', fareRuleSchema);

export const DEFAULT_FARE_RULES = [
    { stage_number: 1, max_km: 2.0, price: 30 },
    { stage_number: 2, max_km: 5.0, price: 45 },
    { stage_number: 3, max_km: 8.0, price: 55 },
    { stage_number: 4, max_km: 12.0, price: 70 },
    { stage_number: 5, max_km: 16.0, price: 85 },
    { stage_number: 6, max_km: 20.0, price: 100 },
    { stage_number: 7, max_km: 25.0, price: 120 },
    { stage_number: 8, max_km: 30.0, price: 140 },
    { stage_number: 9, max_km: 36.0, price: 165 },
    { stage_number: 10, max_km: 42.0, price: 190 },
];
