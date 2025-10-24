import { 
  type MUAStatus,
  type UserRole
} from "../constants/index";
// ===== MUA DTOs =====
export interface CreateMuaDTO extends Omit<CreateUserDTO, 'role'> {
  experienceYears?: number;
  bio?: string;
  location?: string;
}

export interface MuaResponseDTO {
  _id: string;
  userId: string;
  userName?:string;
  avatarUrl?: string;
  experienceYears?: number;
  bio?: string;
  location?: string;
  ratingAverage?: number;
  feedbackCount?: number;
  bookingCount?: number;
  status?: MUAStatus;
}


// ===== EMAIL VERIFICATION & PASSWORD RESET DTOs =====
export interface VerifyEmailDTO {
  token: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

// ===== EMAIL VERIFICATION DTO =====
export interface SendEmailVerificationDTO {
  email: string;
}

// ===== USER DTOs =====

export interface CreateUserDTO {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface UpdateUserDTO {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UserResponseDTO {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole;
  status: string;
  createdAt: Date;
}

export interface AuthResponseDTO {
  user: UserResponseDTO;
  mua?: MuaResponseDTO;
  token: string;
}

// ===== ARTIST DTOs =====
export interface CreateArtistDTO extends Partial<CreateUserDTO> {
  userId: string;
  bio?: string;
  city?: string;
  ratePerHour?: number;
  specialties?: string[];
  experience?: number;
}

export interface UpdateArtistDTO {
  bio?: string;
  city?: string;
  ratePerHour?: number;
  specialties?: string[];
  experience?: number;
  isAvailable?: boolean;
}

export interface ArtistResponseDTO {
  _id: string;
  userId: string;
  bio?: string;
  city?: string;
  ratePerHour?: number;
  specialties?: string[];
  experience?: number;
  isAvailable?: boolean;
  createdAt: Date;
  updatedAt: Date;
}


