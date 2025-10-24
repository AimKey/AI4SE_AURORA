import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, type IUserDocument } from '../models/users.models';
import { EmailService } from './email.service';
import { config } from '../config';
import type { 
  CreateUserDTO, 
  LoginDTO, 
  AuthResponseDTO, 
  UserResponseDTO,
  SendEmailVerificationDTO,
  VerifyEmailDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  CreateMuaDTO,
  MuaResponseDTO
} from '../types/user.dtos';
import { MUA } from '../models/muas.models';
import { MUA_STATUS, USER_ROLES } from '../constants';
import { OAuth2Client } from 'google-auth-library';
import { Wallet } from '@models/transactions.model';

export class AuthService {
  private emailService: EmailService;
  private client: OAuth2Client = new OAuth2Client(config.googleClientId);

  constructor() {
    this.emailService = new EmailService();
  }

  public createAccessToken(userId: string): string {
    return this.generateToken(userId);
  }
  
  // Public: Tạo refresh token (thời hạn dài hơn)
  public createRefreshToken(userId: string): string {
    return jwt.sign(
      { userId },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
  }
  
  // Public: Xác thực refresh token và trả về payload
  public verifyRefreshToken(refreshToken: string): { userId: string } {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as { userId: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Register as MUA (Makeup Artist)
  async registerAsMua(muaData: CreateMuaDTO): Promise<AuthResponseDTO & { mua: MuaResponseDTO }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: muaData.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Generate email verification token
      const verificationToken = this.generateVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create new user with role ARTIST
      const user = new User({
        ...muaData,
        role: USER_ROLES.ARTIST,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });
      await user.save();
 

      // Create MUA profile
      const mua = new MUA({
        userId: user._id,
        experienceYears: muaData.experienceYears,
        bio: muaData.bio,
        location: muaData.location,
        ratingAverage: 0,
        feedbackCount: 0,
        bookingCount: 0,
        status: MUA_STATUS.PENDING,
      });
      await mua.save();

      const muaWallet = new Wallet({muaId: mua._id});
      await muaWallet.save();
      

      // Send verification email
      await this.emailService.sendEmailVerification(
        user.email,
        verificationToken,
        user.fullName
      );

      // Generate token
      const token = this.generateToken(user._id.toString());

      // Return user and mua data
      return {
        user: this.formatUserResponse(user),
        token,
        mua: {
          _id: mua._id.toString(),
          userId: user._id.toString(),
          experienceYears: mua.experienceYears ?? undefined,
          bio: mua.bio ?? undefined,
          location: mua.location ?? undefined,
          ratingAverage: mua.ratingAverage ?? undefined,
          feedbackCount: mua.feedbackCount ?? undefined,
          bookingCount: mua.bookingCount ?? undefined,
          status: mua.status as any,
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate JWT token
  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      config.jwtSecret,
      { expiresIn: '30m' }
    );
  }

  // Generate random token for email verification
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate random token for password reset
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Register new user
  async register(userData: CreateUserDTO): Promise<AuthResponseDTO> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Generate email verification token
      const verificationToken = this.generateVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      
      // Create new user
      const user = new User({
        ...userData,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      await user.save();

      // Send verification email
      await this.emailService.sendEmailVerification(
        user.email,
        verificationToken,
        user.fullName
      );

      // Generate token
      const token = this.generateToken(user._id.toString());

      // Return user data without password
      return {
        user: this.formatUserResponse(user),
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async login(loginData: LoginDTO): Promise<AuthResponseDTO> {
    try {
      // Find user by email
      const user = await User.findOne({ email: loginData.email });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new Error('Account is inactive');
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate token
      const token = this.generateToken(user._id.toString());
      const muaDoc = await MUA.findOne({ userId: user._id });
      
      // Transform MUA document to DTO if it exists
      const mua: MuaResponseDTO | undefined = muaDoc ? {
        _id: muaDoc._id.toString(),
        userId: muaDoc.userId?.toString() || '',
        experienceYears: muaDoc.experienceYears ?? undefined,
        bio: muaDoc.bio ?? undefined,
        location: muaDoc.location ?? undefined,
        ratingAverage: muaDoc.ratingAverage ?? undefined,
        feedbackCount: muaDoc.feedbackCount ?? undefined,
        bookingCount: muaDoc.bookingCount ?? undefined,
        status: muaDoc.status as any // Ensure status is MUAStatus type
      } : undefined;
      
      // Return user data without password
      return {
        user: this.formatUserResponse(user),
        token,
        mua 
      };
    } catch (error) {
      throw error;
    }
  }

  //Google login
  async verifyGoogleToken(credential: string) {
  const ticket = await this.client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload; // chứa email, name, picture, sub (googleId), ...
}
  async loginWithGoogle(data: { credential: string }): Promise<AuthResponseDTO> {
    try {
      const payload = await this.verifyGoogleToken(data.credential);
      if (!payload || !payload.email) {
        throw new Error('Invalid Google token');
      }
      // Check if user already exists
      let user = await User.findOne({ email: payload.email });
      if (!user) {
        // If not, create a new user  
        user = new User({
          fullName: payload.name || 'No Name',
          email: payload.email,
          avatarUrl: payload.picture,
          isEmailVerified: true,
          password: crypto.randomBytes(16).toString('hex'), // Random password
          role: 'USER',
          status: 'ACTIVE'
        });
        await user.save();
      }
      // Generate token
      const token = this.generateToken(user._id.toString());
      // Return user data without password
      return {
        user: this.formatUserResponse(user),
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Send email verification
  async sendEmailVerification(data: SendEmailVerificationDTO): Promise<void> {
    try {
      const user = await User.findOne({ email: data.email });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isEmailVerified) {
        throw new Error('Email is already verified');
      }

      // Generate new verification token
      const verificationToken = this.generateVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = verificationExpires;
      await user.save();

      // Send verification email
      await this.emailService.sendEmailVerification(
        user.email,
        verificationToken,
        user.fullName
      );
    } catch (error) {
      throw error;
    }
  }

  // Verify email
  async verifyEmail(data: VerifyEmailDTO): Promise<void> {
    try {
      const user = await User.findOne({
        emailVerificationToken: data.token,
        emailVerificationExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      // Update user
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
    } catch (error) {
      throw error;
    }
  }

  // Forgot password
  async forgotPassword(data: ForgotPasswordDTO): Promise<void> {
    try {
      const user = await User.findOne({ email: data.email });
      if (!user) {
        // Don't reveal if user exists or not for security
        return;
      }

      // Generate reset token
      const resetToken = this.generateResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpires;
      await user.save();

      // Send reset email
      await this.emailService.sendPasswordReset(
        user.email,
        resetToken,
        user.fullName
      );
    } catch (error) {
      throw error;
    }
  }

  // Reset password
  async resetPassword(data: ResetPasswordDTO): Promise<void> {
    try {
      const user = await User.findOne({
        passwordResetToken: data.token,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password
      user.password = data.newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<IUserDocument | null> {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Verify JWT token
  verifyToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Format user response (remove sensitive data)
  private formatUserResponse(user: IUserDocument): UserResponseDTO {
    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      role: user.role as any,
      status: user.status,
      createdAt: user.createdAt
    };
  }

  // Check if email is verified
  async isEmailVerified(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      return user ? user.isEmailVerified : false;
    } catch (error) {
      return false;
    }
  }

  // Resend verification email
  async resendVerificationEmail(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isEmailVerified) {
        throw new Error('Email is already verified');
      }

      // Generate new verification token
      const verificationToken = this.generateVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = verificationExpires;
      await user.save();

      // Send verification email
      await this.emailService.sendEmailVerification(
        user.email,
        verificationToken,
        user.fullName
      );
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId: string, updateData: any): Promise<UserResponseDTO> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update allowed fields
      const allowedFields = ['fullName', 'phoneNumber', 'avatarUrl'];
      const updateFields: any = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      // Update the user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { ...updateFields, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        throw new Error('Failed to update user');
      }

      return this.formatUserResponse(updatedUser);
    } catch (error) {
      throw error;
    }
  }

  // Get user booking history with optional status filtering
  async getBookingHistory(userId: string, status?: string): Promise<any[]> {
    try {
      const { Booking } = await import('../models/bookings.models');
      const { Types } = await import('mongoose');
      
      // Convert userId string to ObjectId for MongoDB query
      const customerObjectId = new Types.ObjectId(userId);
      
      // Build filter query
      const filter: any = { customerId: customerObjectId };
      if (status && status !== 'ALL') {
        filter.status = status;
      }
      

      // Aggregate booking data with populated service and MUA information
      const bookings = await Booking.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'servicepackages',
            localField: 'serviceId',
            foreignField: '_id',
            as: 'servicePackage'
          }
        },
        {
          $lookup: {
            from: 'muas',
            localField: 'muaId',
            foreignField: '_id',
            as: 'muaProfile'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'muaProfile.userId',
            foreignField: '_id',
            as: 'muaUser'
          }
        },
        {
          $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'bookingId',
            as: 'transaction'
          }
        },
        {
          $unwind: { path: '$servicePackage', preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: '$muaProfile', preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: '$muaUser', preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: '$transaction', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            _id: 1,
            bookingDate: 1,
            bookingTime: 1,
            status: 1,
            totalPrice: 1,
            transportFee: 1,
            locationType: 1,
            address: 1,
            createdAt: 1,
            servicePackage: {
              _id: '$servicePackage._id',
              name: '$servicePackage.name',
              price: '$servicePackage.price',
              duration: '$servicePackage.duration',
              images: '$servicePackage.images'
            },
            mua: {
              _id: '$muaProfile._id',
              fullName: '$muaUser.fullName',
              avatarUrl: '$muaUser.avatarUrl',
              location: '$muaProfile.location'
            },
            transaction: {
              _id: '$transaction._id',
              status: '$transaction.status',
              amount: '$transaction.amount'
            }
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      return bookings;
    } catch (error) {
      console.error('Backend: Error in getBookingHistory:', error);
      throw error;
    }
  }

  // Get user statistics (total spent, booking counts, etc.)
  async getUserStats(userId: string): Promise<any> {
    try {
      console.log('🔍 Backend: Getting user stats for userId:', userId);
      
      const { Booking } = await import('../models/bookings.models');
      const { Types } = await import('mongoose');
      
      // Convert userId string to ObjectId for MongoDB query
      const customerObjectId = new Types.ObjectId(userId);
      
      // Aggregate user statistics
      const stats = await Booking.aggregate([
        { $match: { customerId: customerObjectId } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            completedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            },
            pendingBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
            },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, 1, 0] }
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
            },
            totalSpent: {
              $sum: {
                $cond: [
                  { $ne: ['$status', 'CANCELLED'] },   
                  { $ifNull: ['$totalPrice', 0] },     
                  0
                ]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        totalSpent: 0
      };

      console.log('🔍 Backend: User stats:', result);
      return result;
    } catch (error) {
      console.error('Backend: Error in getUserStats:', error);
      throw error;
    }
  }

  
}
