import { Schema, model, Document } from "mongoose";
import bcrypt from 'bcryptjs';
import { USER_ROLES, USER_STATUS } from "../constants/index";

// Extend User interface for Mongoose Document
export interface IUserDocument extends Document {
  _id: string;
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  followerCount?: number;
  followingCount?: number;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  banReason?: string;
  bannedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?\d\d{0,10}$/, 'Please enter a valid phone number']
  },
  avatarUrl: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER
  },
  status: {
    type: String,
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.ACTIVE
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
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

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Update updatedAt before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});
UserSchema.pre('save', function(next) {
  if(!this.role){
        this.role = USER_ROLES.USER;
      }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Index for better query performance
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ isEmailVerified: 1 });

export const User = model<IUserDocument>('User', UserSchema);
