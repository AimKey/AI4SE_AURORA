export interface PortfolioImageDTO {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export interface CreatePortfolioDTO {
  title: string;
  description?: string;
  tags?: string[];
  images: PortfolioImageDTO[];
  // optional flag in case we support publish toggle on create
  isPublished?: boolean;
  // category must follow backend enum
  category?: string;
}

export interface UpdatePortfolioDTO {
  title?: string;
  description?: string;
  tags?: string[];
  images?: PortfolioImageDTO[];
  isPublished?: boolean;
  category?: string;
}

export interface PortfolioResponseDTO {
  _id: string;
  muaId: string;
  title: string;
  description?: string;
  tags: string[];
  images: PortfolioImageDTO[];
  // include category for UI mapping
  category?: string;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
}
