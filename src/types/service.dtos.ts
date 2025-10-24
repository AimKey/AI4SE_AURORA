// ===== SERVICE DTOs =====
export interface CreateServiceDTO {
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
}

export interface UpdateServiceDTO {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  isActive?: boolean;
  imageUrl?: string;
}

export interface ServiceResponseDTO {
  _id: string;
  muaId: string;
  name: string;
  muaName?:string;
  muaAvatarUrl?:string;
  description: string;
  imageUrl?: string;
  duration: number;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
