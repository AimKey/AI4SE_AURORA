import { BOOKING_STATUS, BOOKING_TYPES } from "constants/index";
import { Schema, model } from "mongoose";


// const FeedbackSchema = new Schema({
//   bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
//   rating: Number,
//   comment: String,
//   createdAt: { type: Date, default: Date.now }
// });

const BookingSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: "User" },
  serviceId: { type: Schema.Types.ObjectId, ref: "ServicePackage" },
  muaId: { type: Schema.Types.ObjectId, ref: "MUA" },
  bookingDate: Date,
  duration: Number,
  locationType: { type: String, enum: Object.values(BOOKING_TYPES)},
  address: String,
  status: { type: String, enum: Object.values(BOOKING_STATUS) },  
  // pending', 'confirmed', 'completed', 'cancelled'
  transportFee: Number,
  totalPrice: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  payed: { type: Boolean, default: false },
  note: String,
  feedbackId:  { type: Schema.Types.ObjectId, ref: "Feedback", default: null },
  paymentId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  completedAt: { type: Date, default: null },
});

export const Booking = model("Booking", BookingSchema);
// export const Feedback = model("Feedback", FeedbackSchema);
