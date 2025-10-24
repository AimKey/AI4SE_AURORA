// apps/backend/src/models/feedback.model.ts
import { Schema, model, Types, Document } from "mongoose";

export interface FeedbackDocument extends Document {
  bookingId: Types.ObjectId;
  userId: Types.ObjectId; // customer
  muaId: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<FeedbackDocument>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    userId:    { type: Schema.Types.ObjectId, ref: "User",   required: true },
    muaId:     { type: Schema.Types.ObjectId, ref: "MUA",    required: true },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   { type: String, default: "" },
  },
  { timestamps: true, collection: "feedbacks" }
);

// 1 feedback cho mỗi (booking, user) — đổi thành chỉ booking nếu bạn muốn “1 booking = 1 feedback”
FeedbackSchema.index({ bookingId: 1, userId: 1 }, { unique: true, name: "uniq_booking_user" });
FeedbackSchema.index({ muaId: 1, createdAt: -1 }, { name: "mua_time" });

export const Feedback = model<FeedbackDocument>("Feedback", FeedbackSchema);
