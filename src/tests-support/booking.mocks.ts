// Shared Jest mocks for booking service CRUD tests

// Build chainable mongoose-like query mock
export const makeQuery = (result: any) => {
  const q: any = {
    populate: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
    lean: jest.fn().mockResolvedValue(result),
  };
  return q;
};

// Constructable Booking mock with static methods
const BookingMockFactory = () => {
  const Booking: any = jest.fn(function Booking(this: any, data: any) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue({ _id: 'saved-id', ...data });
  });
  Booking.find = jest.fn().mockReturnValue(makeQuery([]));
  Booking.findById = jest.fn().mockReturnValue(makeQuery(null));
  Booking.findByIdAndUpdate = jest.fn().mockReturnValue(makeQuery(null));
  Booking.findByIdAndDelete = jest.fn().mockReturnValue(makeQuery(null));
  Booking.countDocuments = jest.fn().mockResolvedValue(0);
  return Booking;
};

export const Booking = BookingMockFactory();

// Mock the Booking model via path alias used in SUT
jest.mock('models/bookings.models', () => ({
  Booking,
}));

// Mock mongoose.model for 'User', 'Transaction', 'Wallet' lookups
export const userSave = jest.fn().mockResolvedValue(undefined);
export const userDoc = { _id: 'user-1', phoneNumber: 'old', save: userSave } as any;
export const userModel = {
  findById: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(userDoc) })),
};
export const transactionModel = { findOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })) } as any;
export const walletModel = { findOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })) } as any;

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  const model = jest.fn((name: string) => {
    if (name === 'User') return userModel as any;
    if (name === 'Transaction') return transactionModel as any;
    if (name === 'Wallet') return walletModel as any;
    return {} as any;
  });
  return {
    ...actual,
    model,
  };
});

// Mock formatter and slot service using resolved absolute paths to match SUT's relative imports
jest.mock(require.resolve('../utils/booking.formatter'), () => ({
  formatBookingResponse: jest.fn((b: any) => ({
    _id: b?._id?.toString?.() || b?._id || 'mock-id',
    status: b?.status || 'PENDING',
    bookingDate: b?.bookingDate,
    duration: b?.duration,
    customerId: b?.customerId,
    muaId: b?.muaId,
    serviceId: b?.serviceId,
  })),
}));

jest.mock(require.resolve('../services/slot.service'), () => ({
  invalidateWeeklyCache: jest.fn().mockResolvedValue(undefined),
}));
