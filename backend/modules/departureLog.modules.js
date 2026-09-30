import mongoose from 'mongoose';

const departureLogSchema = new mongoose.Schema(
  {
    schedule_id:           { type: String, required: true },
    bus_number:            { type: String, required: true },
    route_name:            { type: String, default: '' },
    route_number:          { type: String, default: '' },
    admin_username:        { type: String, default: 'admin' },
    actual_departure_date: { type: String, required: true },
    actual_departure_time: { type: String, required: true },
    is_delayed:            { type: Boolean, default: false },
    delay_minutes:         { type: Number,  default: 0 },
    delay_reason:          { type: String,  default: '' },
    other_delay_reason:    { type: String,  default: '' },
    recorded_at:           { type: Date,    default: Date.now },
  },
  { collection: 'departure_logs' }
);

export function getDepartureLogModel() {
  return mongoose.models.DepartureLog || mongoose.model('DepartureLog', departureLogSchema);
}
