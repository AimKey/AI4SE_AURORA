import { 
  type BookingStatus,
  type BookingType
} from "../constants/index";
import type { ServiceResponseDTO } from "./service.dtos";
import type { ArtistResponseDTO, MuaResponseDTO } from "./user.dtos";

// ===== BOOKING DTOs =====
export interface CreateBookingDTO {
  customerId: string;
  customerPhone?: string;
  serviceId: string;
  muaId: string;
  bookingDate: Date;
  duration: number;
  locationType: BookingType;
  address: string;
  transportFee?: number;
  totalPrice: number;
  payed?: boolean;
  note?: string;
}


export interface UpdateBookingDTO {
  customerId?: string;
  serviceId?: string;
  muaId?: string;
  bookingDate?: Date;
  duration?: number;
  locationType?: BookingType;
  address?: string;
  status?: BookingStatus;
  transportFee?: number;
  totalPrice?: number;
  payed?: boolean;
  note?: string;
}

export interface BookingResponseDTO {
  _id: string;
  customerId: string;
  artistId: string;
  serviceId: string;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  servicePrice: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  locationType: BookingType;
  address: string;
  status: BookingStatus;
  transportFee?: number;
  totalPrice: number;
  note?: string;
  payed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingBookingResponseDTO {
  _id?: string;
  customerId: string;
  artistId: string;
  serviceId: string;
  orderCode?: number;
  customerPhone?: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  servicePrice: number;
  startTime: string;
  endTime: string;
  duration: number;
  locationType: BookingType;
  address: string;
  status: BookingStatus;
  transportFee?: number;
  totalPrice: number;
  note?: string;
  payed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface IBookingSlot {
  serviceId:string;
  day: string; 
  startTime: string;
  endTime: string;
}

export interface IAvailableMuaServices{
    day:string;
    mua:MuaResponseDTO; 
    services:ServiceResponseDTO[]
}

// Response DTO for mark-completed endpoint
export interface CompleteBookingResponseDTO {
  _id: string;
  status: BookingStatus;
  completedAt: Date | null;
}