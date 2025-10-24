// User Roles
export const USER_ROLES = {
  USER: 'USER',
  ARTIST: 'ARTIST',
  ADMIN: 'ADMIN'
} as const;

// User Status
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BANNED: 'BANNED'
} as const;

// MUA Status
export const MUA_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED', 
  REJECTED: 'REJECTED'
} as const;

// Booking Status
export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
} as const;
// booking type
export const BOOKING_TYPES = {
  HOME: 'HOME',
  STUDIO: 'STUDIO',
} as const;

// Portfolio Categories
export const PORTFOLIO_CATEGORIES = {
  BRIDAL: 'BRIDAL',
  PARTY: 'PARTY',
  GRADUATION: 'GRADUATION',    
  DAILY: 'DAILY',           
  PROM: 'PROM',             
  WEDDING_GUEST: 'WEDDING_GUEST',    
} as const;

// Service Categories for makeup occasions
export const SERVICE_CATEGORIES = {
  BRIDAL: 'BRIDAL',          
  PARTY: 'PARTY',             
  WEDDING_GUEST: 'WEDDING_GUEST', 
  GRADUATION: 'GRADUATION',  
  PHOTOSHOOT: 'PHOTOSHOOT',    
  PROM: 'PROM',               
  DAILY: 'DAILY',             
  SPECIAL_EVENT: 'SPECIAL_EVENT' 
} as const;

// Service Add-ons for makeup services
export const SERVICE_ADDONS = {
  HAIR_STYLING: 'HAIR_STYLING',
  FALSE_LASHES: 'FALSE_LASHES',
  SKINCARE_PREP: 'SKINCARE_PREP',
  PHOTOGRAPHY: 'PHOTOGRAPHY',
  TOUCH_UP_KIT: 'TOUCH_UP_KIT',
  TRAVEL_SERVICE: 'TRAVEL_SERVICE',
  AIRBRUSH_MAKEUP: 'AIRBRUSH_MAKEUP',
  CONTOURING: 'CONTOURING'
} as const;

//Media types
export const RESOURCE_TYPES = {
  image: 'image',
  video: 'video',
  raw: 'raw'
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_REMINDER: 'BOOKING_REMINDER',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED'
} as const;

export const SLOT_TYPES = {
  ORIGINAL_WORKING: 'ORIGINAL_WORKING',
  OVERRIDE: 'OVERRIDE',
  BLOCKED: 'BLOCKED',
  NEW_WORKING: 'NEW_WORKING',
  NEW_OVERRIDE:'NEW_OVERRIDE',
  BOOKING: 'BOOKING'
} as const;

export const TRANSACTION_STATUS = {
  HOLD:'HOLD' ,
  CAPTURED: 'CAPTURED' ,
  PENDING_REFUND: 'PENDING_REFUND',
  REFUNDED: 'REFUNDED'
} as const;
export const REFUND_REASON = {
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;
export const WITHDRAW_STATUS = {
  PENDING:'PENDING',
  PROCESSING:'PROCESSING',
  SUCCESS:'SUCCESS',
  FAILED:'FAILED'
} as const;

export const PAYOUT_CATEGORIES={
  REFUND:'REFUND',
  WITHDRAWAL:'WITHDRAWAL'
}
export const PAYMENT_METHODS  = {
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;

//COMUNITY
export const POST_STATUS = {
  PUBLISHED: 'PUBLISHED',
  PRIVATE: 'PRIVATE'
} as const;
export const TARGET_TYPES = {
  POST: 'POST',
  COMMENT: 'COMMENT'
} as const;
// Type definitions derived from constants
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type MUAStatus = typeof MUA_STATUS[keyof typeof MUA_STATUS];
export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];
export type BookingType = typeof BOOKING_TYPES[keyof typeof BOOKING_TYPES];
export type ResourceType = typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES];
export type PortfolioCategory = typeof PORTFOLIO_CATEGORIES[keyof typeof PORTFOLIO_CATEGORIES];
export type ServiceCategory = typeof SERVICE_CATEGORIES[keyof typeof SERVICE_CATEGORIES];
export type ServiceAddon = typeof SERVICE_ADDONS[keyof typeof SERVICE_ADDONS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type SlotType = typeof SLOT_TYPES[keyof typeof SLOT_TYPES];
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];
export type WithdrawStatus = typeof WITHDRAW_STATUS[keyof typeof WITHDRAW_STATUS];
export type PayoutCategory = typeof PAYOUT_CATEGORIES[keyof typeof PAYOUT_CATEGORIES];
export type PostStatus = typeof POST_STATUS[keyof typeof POST_STATUS];
export type TargetType = typeof TARGET_TYPES[keyof typeof TARGET_TYPES];
export type RefundReason = typeof REFUND_REASON[keyof typeof REFUND_REASON];