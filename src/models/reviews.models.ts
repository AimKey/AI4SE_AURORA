import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
  artistId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;            // 1..5
  comment?: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    artistId: { type: Schema.Types.ObjectId, ref: "MUA", required: true, index: true },
    userId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating:   { type: Number, min: 1, max: 5, required: true, index: true },
    comment:  { type: String, trim: true, maxlength: 1000 },
    createdAt:{ type: Date, default: Date.now }
  },
  { versionKey: false }
);

ReviewSchema.index({ artistId: 1, createdAt: -1 });

export const Review: Model<IReview> = mongoose.model<IReview>("Review", ReviewSchema);