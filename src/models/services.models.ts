import { Schema, model } from "mongoose";
import { SERVICE_CATEGORIES } from "../constants/index";

const ServicePackageSchema = new Schema({
  muaId: { type: Schema.Types.ObjectId, ref: "MUA" },
  name: String,
  description: String,
  price: Number,
  duration: Number,
  imageUrl: String,
  category: {
    type: String,
    enum: Object.values(SERVICE_CATEGORIES),
    required: true,
    default: SERVICE_CATEGORIES.DAILY
  },
  isAvailable: Boolean,
  // Keep createdAt explicitly for backward compatibility; updatedAt will be added by timestamps
  createdAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: false, updatedAt: true } });

// Add indexes for better query performance
ServicePackageSchema.index({ muaId: 1 });
ServicePackageSchema.index({ category: 1, isAvailable: 1 });

export const ServicePackage = model("ServicePackage", ServicePackageSchema);
