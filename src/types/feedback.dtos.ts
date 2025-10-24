
export interface CreateFeedbackDTO { 
  bookingId: string; 
  rating: number; 
  comment?: string; 
} 


export interface UpdateFeedbackDTO { 
  rating?: number; 
  comment?: string; 
} 


export interface FeedbackResponseDTO { 
  _id: string; 
  bookingId: string; 
  userId: string; 
  muaId: string; 
  rating: number; 
  comment?: string; 
  createdAt: string; 
  updatedAt: string; 
} 
