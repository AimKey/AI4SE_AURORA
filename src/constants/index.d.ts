export declare const USER_ROLES: {
    readonly USER: "USER";
    readonly ARTIST: "ARTIST";
    readonly ADMIN: "ADMIN";
};
export declare const USER_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
    readonly BANNED: "BANNED";
};
export declare const MUA_STATUS: {
    readonly PENDING: "PENDING";
    readonly APPROVED: "APPROVED";
    readonly REJECTED: "REJECTED";
};
export declare const BOOKING_STATUS: {
    readonly PENDING: "PENDING";
    readonly CONFIRMED: "CONFIRMED";
    readonly REJECTED: "REJECTED";
    readonly CANCELLED: "CANCELLED";
    readonly COMPLETED: "COMPLETED";
};
export declare const BOOKING_TYPES: {
    readonly HOME: "HOME";
    readonly STUDIO: "STUDIO";
};
export declare const PORTFOLIO_CATEGORIES: {
    readonly BRIDAL: "BRIDAL";
    readonly PARTY: "PARTY";
    readonly GRADUATION: "GRADUATION";
    readonly DAILY: "DAILY";
    readonly PROM: "PROM";
    readonly WEDDING_GUEST: "WEDDING_GUEST";
};
export declare const SERVICE_CATEGORIES: {
    readonly BRIDAL: "BRIDAL";
    readonly PARTY: "PARTY";
    readonly WEDDING_GUEST: "WEDDING_GUEST";
    readonly GRADUATION: "GRADUATION";
    readonly PROM: "PROM";
    readonly DAILY: "DAILY";
    readonly SPECIAL_EVENT: "SPECIAL_EVENT";
};
export declare const SERVICE_ADDONS: {
    readonly HAIR_STYLING: "HAIR_STYLING";
    readonly FALSE_LASHES: "FALSE_LASHES";
    readonly SKINCARE_PREP: "SKINCARE_PREP";
    readonly PHOTOGRAPHY: "PHOTOGRAPHY";
    readonly TOUCH_UP_KIT: "TOUCH_UP_KIT";
    readonly TRAVEL_SERVICE: "TRAVEL_SERVICE";
    readonly AIRBRUSH_MAKEUP: "AIRBRUSH_MAKEUP";
    readonly CONTOURING: "CONTOURING";
};
export declare const RESOURCE_TYPES: {
    readonly image: "image";
    readonly video: "video";
    readonly raw: "raw";
};
export declare const PAYMENT_STATUS: {
    readonly PENDING: "PENDING";
    readonly PAID: "PAID";
    readonly FAILED: "FAILED";
    readonly REFUNDED: "REFUNDED";
};
export declare const NOTIFICATION_TYPES: {
    readonly BOOKING_CONFIRMED: "BOOKING_CONFIRMED";
    readonly BOOKING_CANCELLED: "BOOKING_CANCELLED";
    readonly BOOKING_REMINDER: "BOOKING_REMINDER";
    readonly PAYMENT_SUCCESS: "PAYMENT_SUCCESS";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
};
export declare const SLOT_TYPES: {
    readonly ORIGINAL_WORKING: "ORIGINAL_WORKING";
    readonly OVERRIDE: "OVERRIDE";
    readonly BLOCKED: "BLOCKED";
    readonly NEW_WORKING: "NEW_WORKING";
    readonly NEW_OVERRIDE: "NEW_OVERRIDE";
    readonly BOOKING: "BOOKING";
};
export declare const TRANSACTION_STATUS: {
    readonly HOLD: "HOLD";
    readonly CAPTURED: "CAPTURED";
    readonly PENDING_REFUND: "PENDING_REFUND";
    readonly REFUNDED: "REFUNDED";
};
export declare const REFUND_REASON: {
    readonly CANCELLED: "CANCELLED";
    readonly REJECTED: "REJECTED";
};
export declare const WITHDRAW_STATUS: {
    readonly PENDING: "PENDING";
    readonly PROCESSING: "PROCESSING";
    readonly SUCCESS: "SUCCESS";
    readonly FAILED: "FAILED";
};
export declare const PAYOUT_CATEGORIES: {
    REFUND: string;
    WITHDRAWAL: string;
};
export declare const PAYMENT_METHODS: {
    readonly BANK_TRANSFER: "BANK_TRANSFER";
};
export declare const POST_STATUS: {
    readonly PUBLISHED: "PUBLISHED";
    readonly PRIVATE: "PRIVATE";
};
export declare const TARGET_TYPES: {
    readonly POST: "POST";
    readonly COMMENT: "COMMENT";
};
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
