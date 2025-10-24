import type { UserRole, UserStatus, MUAStatus } from "../constants/index";
import type { UserResponseDTO, MuaResponseDTO } from "./user.dtos";

// ===== ADMIN USER QUERY DTOs =====
export interface AdminUserQueryDTO {
  page?: number;
  pageSize?: number;
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  search?: string; // Search by name, email, phone
  sortBy?: 'createdAt' | 'fullName' | 'email' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  fromDate?: string;
  toDate?: string;
}

export interface AdminMUAQueryDTO {
  page?: number;
  pageSize?: number;
  status?: MUAStatus | 'all';
  search?: string; // Search by name, bio, location
  sortBy?: 'createdAt' | 'name' | 'rating' | 'bookingCount';
  sortOrder?: 'asc' | 'desc';
  fromDate?: string;
  toDate?: string;
}

// ===== ADMIN RESPONSE DTOs =====
export interface AdminUserResponseDTO extends UserResponseDTO {
  isEmailVerified?: boolean;
  isBanned?: boolean;
  lastLogin?: Date;
  updatedAt?: Date;
  banReason?: string;
  bannedAt?: Date;
}

export interface AdminMUAResponseDTO extends MuaResponseDTO {
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  experience?: number;
  rating?: number;
  totalReviews?: number;
  bookingCount?: number;
  completedBookings?: number;
  totalEarnings?: number;
  pendingWithdrawal?: number;
  profilePicture?: string;
  location?: string;
  status: MUAStatus;
  joinedAt?: Date;
  lastActive?: Date;
  specialties?: string[];
  portfolio?: {
    images: number;
    videos: number;
    total: number;
  };
  verification?: {
    identity: boolean;
    portfolio: boolean;
    background: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  user?: AdminUserResponseDTO; // Populated user info
  rejectionReason?: string;
}

// ===== PAGINATED RESPONSE DTOs =====
export interface AdminUserListResponseDTO {
  users: AdminUserResponseDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  statistics: {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    newUsersThisMonth: number;
  };
}

export interface AdminMUAListResponseDTO {
  muas: AdminMUAResponseDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  statistics: {
    totalMUAs: number;
    activeMUAs: number;
    pendingMUAs: number;
    approvedMUAs: number;
    rejectedMUAs: number;
    bannedMUAs: number;
  };
}

// ===== ADMIN ACTION DTOs =====
export interface BanUserDTO {
  reason?: string;
}

export interface ApproveMUADTO {
  adminNotes?: string;
}

export interface RejectMUADTO {
  reason: string;
}

export interface BulkBanUsersDTO {
  userIds: string[];
  reason?: string;
}

export interface BulkApproveMUAsDTO {
  muaIds: string[];
  adminNotes?: string;
}

// ===== STATISTICS DTOs =====
export interface UserStatisticsDTO {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  newUsersThisMonth: number;
  usersByRole: {
    [key in UserRole]: number;
  };
}

export interface MUAStatisticsDTO {
  totalMUAs: number;
  activeMUAs: number;
  pendingMUAs: number;
  approvedMUAs: number;
  rejectedMUAs: number;
  bannedMUAs: number;
  reviewingMUAs: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  totalBookings: number;
  totalEarnings: number;
  avgRating: number;
}
