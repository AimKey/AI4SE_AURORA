// ===== COMMON DTOs =====
export interface PaginationDTO {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponseDTO<T = any> {
  status?: number;
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// ===== SEARCH DTOs =====
export interface SearchDTO {
  query?: string;
  filters?: Record<string, any>;
  pagination?: PaginationDTO;
}

export interface SearchResponseDTO<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: Record<string, any>;
}

// ===== FILE UPLOAD DTOs =====
export interface FileUploadDTO {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

export interface FileUploadResponseDTO {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

// ===== VALIDATION DTOs =====
export interface ValidationErrorDTO {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResponseDTO {
  success: boolean;
  errors: ValidationErrorDTO[];
}
