// apps/backend/src/types/artists.dtos.ts
import type { ServiceCategory, ServiceAddon } from '../constants';
import type { ServiceResponseDTO } from './service.dtos';

// ===== REQUEST DTOs =====
export interface GetArtistsQueryDTO {
  // Search filters
  q?: string;           // Artist name search
  location?: string;    // Location filter
  occasion?: string;    // Service category filter
  style?: string;       // Style/tone search in services
  
  // Rating and price filters
  rating?: number;      // Minimum rating filter
  priceMin?: number;    // Minimum price filter (VND)
  priceMax?: number;    // Maximum price filter (VND)
  
  // Add-ons filter
  addons?: string[];    // Array of service add-ons
  
  // Sorting and pagination
  sort?: 'rating_desc' | 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface GetArtistServicesQueryDTO {
  // Service filters
  category?: ServiceCategory;
  q?: string;           // Service name/description search
  priceMin?: number;
  priceMax?: number;
  addons?: string[];
  
  // Sorting and pagination
  sort?: 'rating_desc' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

// ===== RESPONSE DTOs =====
export interface ArtistResponseDTO {
  _id: string;
  fullName: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  experienceYears?: number;
  ratingAverage: number;
  feedbackCount: number;
  bookingCount: number;
  isVerified: boolean;
  minPrice?: number;
  
  // Service preview (max 2 services for list view)
  services?: ServicePreviewDTO[];
  totalServices?: number;
}

export interface ServicePreviewDTO {
  _id: string;
  name: string;
  price: number;
  benefits?: string[];
  addons?: ServiceAddon[];
  images?: string[];
  duration: number
}

export interface ArtistServiceResponseDTO {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category: ServiceCategory;
  addons?: ServiceAddon[];
  benefits?: string[];
  images?: string[];
  isAvailable: boolean;
  bookingCount: number;
  createdAt: Date;
}

// ===== PAGINATED RESPONSES =====
export interface ArtistsListResponseDTO {
  items: ArtistResponseDTO[];
  total: number;
  pages: number;
  page: number;
}

export interface ServicesListResponseDTO {
  items: ServiceResponseDTO[];
  total: number;
  pages: number;
  page: number;
}