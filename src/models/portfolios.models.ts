import { Schema, model } from "mongoose";
import { PORTFOLIO_CATEGORIES } from "../constants/index";

const PortfolioMediaSchema = new Schema({
  mediaType: { 
    type: String, 
    enum: ["IMAGE", "VIDEO"] 
  },
  url: {
    type: String,
    required: true
  },
  caption: String,
  displayOrder: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: Object.values(PORTFOLIO_CATEGORIES),
    default: PORTFOLIO_CATEGORIES.DAILY
  }
});

const PortfolioImageSchema = new Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  width: { type: Number },
  height: { type: Number }
}, { _id: false });

const PortfolioSchema = new Schema({
  muaId: { 
    type: Schema.Types.ObjectId, 
    ref: "MUA",
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: Object.values(PORTFOLIO_CATEGORIES),
    default: PORTFOLIO_CATEGORIES.DAILY
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  media: [PortfolioMediaSchema],
  images: [PortfolioImageSchema],
  isPublished: { type: Boolean, default: true }
});

// Add indexes
PortfolioSchema.index({ muaId: 1 });
PortfolioSchema.index({ category: 1 });
PortfolioSchema.index({ createdAt: -1 });
PortfolioSchema.index({ muaId: 1, createdAt: -1 });

// Array length validation for tags
PortfolioSchema.path('tags').validate(function (value: string[]) {
  if (!Array.isArray(value)) return true;
  return value.length <= 10;
}, 'Tags cannot exceed 10 items');

const CertificateImageSchema = new Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  width: { type: Number },
  height: { type: Number }
}, { _id: false });

const CertificateSchema = new Schema({
  muaId: { 
    type: Schema.Types.ObjectId, 
    ref: "MUA",
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  issuer: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Issuer cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  issueDate: {
    type: Date,
    required: true
  },
  expireDate: {
    type: Date
  },
  image: {
    type: CertificateImageSchema,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes
CertificateSchema.index({ muaId: 1 });
CertificateSchema.index({ createdAt: -1 });
CertificateSchema.index({ muaId: 1, createdAt: -1 });

// Validate expireDate is after issueDate
CertificateSchema.pre('save', function(next) {
  if (this.expireDate && this.issueDate && this.expireDate < this.issueDate) {
    next(new Error('Expire date must be after issue date'));
  } else {
    next();
  }
});
export const Portfolio = model("Portfolio", PortfolioSchema);
export const Certificate = model("Certificate", CertificateSchema);
