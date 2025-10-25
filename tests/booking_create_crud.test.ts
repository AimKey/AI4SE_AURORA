// Jest unit tests for createBooking in booking.service.ts

// Build chainable mongoose-like query mock
const makeQuery = (result: any) => {
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

const Booking = BookingMockFactory();

// Mock the Booking model via path alias used in SUT
jest.mock('models/bookings.models', () => ({
  Booking,
}));

// Mock mongoose.model for 'User' lookups (shared instance for assertions)
const userSave = jest.fn().mockResolvedValue(undefined);
const userDoc = { _id: 'user-1', phoneNumber: 'old', save: userSave };
const userModel = {
  findById: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(userDoc) })),
};
const transactionModel = { findOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })) };
const walletModel = { findOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })) };

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
jest.mock(require.resolve('../src/utils/booking.formatter'), () => ({
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

jest.mock(require.resolve('../src/services/slot.service'), () => ({
  invalidateWeeklyCache: jest.fn().mockResolvedValue(undefined),
}));

// Import SUT and mocked deps AFTER mocks are defined
import { createBooking, getBookingById, getAllBookings, getBookingsByDate, getBookingsByCustomer, getBookingsByMUA, updateBooking } from '../src/services/booking.service';
import { invalidateWeeklyCache } from '../src/services/slot.service';
import { formatBookingResponse } from '../src/utils/booking.formatter';

describe('createBooking - tests (Happy → Edge → Error → Integration)', () => {
  const baseData = {
    muaId: 'm-1',
    customerId: 'c-1',
    customerPhone: '0123456789',
    serviceId: 's-1',
    bookingDate: new Date('2024-01-01T09:00:00Z'),
    duration: 60,
    type: 'NORMAL',
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Booking default statics
    (Booking.find as jest.Mock).mockReturnValue(makeQuery([]));
    (Booking.findById as jest.Mock).mockReturnValue(
      makeQuery({ _id: 'saved-id', status: 'PENDING', ...baseData })
    );

    // Reset mongoose user lookup
    (userModel.findById as any).mockReturnValue({ exec: jest.fn().mockResolvedValue(userDoc) });
    userDoc.phoneNumber = 'old';
    userSave.mockResolvedValue(undefined);
  });

  // ---------------- Happy paths (5) ----------------
  it('HP-1: creates booking when no conflict; updates customer; invalidates cache; returns formatted', async () => {
    const res = await createBooking({ ...baseData } as any);

    expect(Booking).toHaveBeenCalledWith(expect.objectContaining({ muaId: baseData.muaId, status: 'PENDING' }));
    expect((Booking as any).mock.instances[0].save).toHaveBeenCalledTimes(1);

    expect(userModel.findById).toHaveBeenCalledWith(baseData.customerId);
    expect(userDoc.phoneNumber).toBe(baseData.customerPhone);
    expect(userSave).toHaveBeenCalled();

    expect(Booking.findById).toHaveBeenCalledWith('saved-id');
    expect(invalidateWeeklyCache).toHaveBeenCalledWith(baseData.muaId, baseData.bookingDate);
    expect(formatBookingResponse).toHaveBeenCalled();
    expect(res).toEqual(expect.objectContaining({ _id: 'saved-id', bookingDate: baseData.bookingDate }));
  });

  it('HP-2: uses populated booking for formatting (not raw saved one)', async () => {
    const populated = { _id: 'saved-id', status: 'PENDING', ...baseData, extra: 'pop' };
    (Booking.findById as jest.Mock).mockReturnValueOnce(makeQuery(populated));

    const res = await createBooking({ ...baseData } as any);
    expect(formatBookingResponse).toHaveBeenCalledWith(populated);
    expect(res).toEqual(expect.objectContaining({ _id: 'saved-id', serviceId: baseData.serviceId }));
  });

  it('HP-3: correct payload to Booking constructor and save invoked once', async () => {
    await createBooking({ ...baseData } as any);
    expect(Booking).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING', createdAt: expect.any(Date) }));
    expect((Booking as any).mock.instances[0].save).toHaveBeenCalledTimes(1);
  });

  it('HP-4: supports creating booking at midnight boundary', async () => {
    const data = { ...baseData, bookingDate: new Date('2024-06-01T00:00:00Z') };
    const res = await createBooking(data as any);
    expect(res._id).toBe('saved-id');
    expect(invalidateWeeklyCache).toHaveBeenCalledWith(data.muaId, data.bookingDate);
  });

  it('HP-5: supports long duration when there are no existing bookings', async () => {
    const data = { ...baseData, duration: 12 * 60 };
    const res = await createBooking(data as any);
    expect(res._id).toBe('saved-id');
  });

  // ---------------- Edge cases (3) ----------------
  it('EDGE-1: zero-minute duration is accepted (no overlap)', async () => {
    const data = { ...baseData, duration: 0 };
    (Booking.findById as jest.Mock).mockReturnValueOnce(
      makeQuery({ _id: 'saved-id', status: 'PENDING', ...data })
    );
    const res = await createBooking(data as any);
    expect(res.duration).toBe(0);
  });

  it('EDGE-2: leap day booking is handled correctly', async () => {
    const data = { ...baseData, bookingDate: new Date('2024-02-29T08:00:00Z') };
    (Booking.findById as jest.Mock).mockReturnValueOnce(
      makeQuery({ _id: 'saved-id', status: 'PENDING', ...data })
    );
    const res = await createBooking(data as any);
    expect(res.bookingDate).toEqual(data.bookingDate);
  });

  it('EDGE-3: ignores unrelated extra fields without failing', async () => {
    const data: any = { ...baseData, notes: 'be on time', extraMeta: { a: 1 } };
    const res = await createBooking(data);
    expect(res._id).toBe('saved-id');
  });

  // ---------------- Errors (3) ----------------
  it('ERR-1: throws on time conflict (overlap)', async () => {
    // Existing 10:00-11:00, new 10:30-11:30 → overlap
    const existing = { _id: 'ex-1', bookingDate: new Date('2024-01-01T10:00:00Z'), duration: 60 };
    (Booking.find as jest.Mock).mockReturnValueOnce(makeQuery([existing]));

    const data = { ...baseData, bookingDate: new Date('2024-01-01T10:30:00Z'), duration: 60 };
    await expect(createBooking(data as any)).rejects.toThrow(/Booking conflict detected/);
    expect(Booking).not.toHaveBeenCalled();
  });

  it('ERR-2: throws when customer not found', async () => {
    (Booking.find as jest.Mock).mockReturnValueOnce(makeQuery([]));
    (userModel.findById as any).mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
    await expect(createBooking({ ...baseData } as any)).rejects.toThrow(/Customer not found/);
  });

  it('ERR-3: throws when populated booking cannot be retrieved after save', async () => {
    (Booking.find as jest.Mock).mockReturnValueOnce(makeQuery([]));
    (Booking.findById as jest.Mock).mockReturnValueOnce(makeQuery(null));
    await expect(createBooking({ ...baseData } as any)).rejects.toThrow(/Failed to retrieve created booking/);
  });

  // ---------------- Integration-like (cache) (1) ----------------
  it('INT-1: integrates with weekly cache invalidation (called once with correct args)', async () => {
    await createBooking({ ...baseData } as any);
    expect(invalidateWeeklyCache).toHaveBeenCalledTimes(1);
    expect(invalidateWeeklyCache).toHaveBeenCalledWith(baseData.muaId, baseData.bookingDate);
  });
});

describe('getBookingById - tests (Happy → Edge → Error → Integration)', () => {
  const bookingId = 'b-1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: found booking document
    const doc = {
      _id: bookingId,
      status: 'CONFIRMED',
      bookingDate: new Date('2024-01-02T10:00:00Z'),
      duration: 90,
      customerId: { _id: 'c-10', fullName: 'Alice' },
      muaId: { _id: 'm-10', fullName: 'Mia' },
      serviceId: { _id: 's-10', name: 'Bridal' },
    };
    (Booking.findById as jest.Mock).mockReturnValue(makeQuery(doc));
  });


  describe('getAllBookings - tests (Happy → Edge → Error → Integration)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (Booking.countDocuments as jest.Mock).mockResolvedValue(0);
      (Booking.find as jest.Mock).mockReturnValue(makeQuery([]));
    });

    // ---------------- Happy paths (5) ----------------
    it('HP-GAB-1: returns formatted bookings and correct pagination defaults', async () => {
      const docs = [
        { _id: 'b1', status: 'CONFIRMED', createdAt: new Date() },
        { _id: 'b2', status: 'PENDING', createdAt: new Date() },
      ];
      const q = makeQuery(docs);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(2);

      const res = await getAllBookings();

      expect(res.page).toBe(1);
      expect(res.total).toBe(2);
      expect(res.totalPages).toBe(1);
      expect(res.bookings).toHaveLength(2);
      expect(formatBookingResponse).toHaveBeenCalledTimes(2);
    });

    it('HP-GAB-2: applies status filter when provided', async () => {
      const status = 'CONFIRMED';
      const q = makeQuery([]);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      await getAllBookings(1, 10, status);

      expect(Booking.find).toHaveBeenCalledWith({ status });
      expect(Booking.countDocuments).toHaveBeenCalledWith({ status });
    });

    it('HP-GAB-3: respects skip/limit from page and pageSize', async () => {
      const q = makeQuery([]);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      await getAllBookings(2, 5);

      expect(q.skip).toHaveBeenCalledWith(5);
      expect(q.limit).toHaveBeenCalledWith(5);
    });

    it('HP-GAB-4: sorts by createdAt descending', async () => {
      const q = makeQuery([]);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      await getAllBookings(1, 10);

      expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('HP-GAB-5: populates relations before mapping', async () => {
      const docs = [{ _id: 'b1' }, { _id: 'b2' }];
      const q = makeQuery(docs);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(2);

      await getAllBookings(1, 10);

      expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
      expect(q.exec).toHaveBeenCalledTimes(1);
      expect(formatBookingResponse).toHaveBeenCalledTimes(2);
    });

    // ---------------- Edge cases (3) ----------------
    it('EDGE-GAB-1: empty list yields empty results and zero totals', async () => {
      const q = makeQuery([]);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      const res = await getAllBookings(1, 10);

      expect(res.bookings).toEqual([]);
      expect(res.total).toBe(0);
      expect(res.totalPages).toBe(0);
      expect(formatBookingResponse).not.toHaveBeenCalled();
    });

    it('EDGE-GAB-2: single-item pages produce correct totalPages', async () => {
      const q = makeQuery([{ _id: 'only' }]);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(3);

      const res = await getAllBookings(1, 1);
      expect(res.totalPages).toBe(3);
    });

    it('EDGE-GAB-3: page beyond last returns empty page but preserves metadata', async () => {
      const q = makeQuery([]);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(5);

      const res = await getAllBookings(4, 2);
      expect(res.bookings).toHaveLength(0);
      expect(res.total).toBe(5);
      expect(res.page).toBe(4);
      expect(res.totalPages).toBe(3);
    });

    // ---------------- Errors (3) ----------------
    it('ERR-GAB-1: formatter throws for an item → service wraps error', async () => {
      const docs = [{ _id: 'b1' }];
      const q = makeQuery(docs);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(1);
      (formatBookingResponse as jest.Mock).mockImplementationOnce(() => {
        throw new Error('format fail');
      });

      await expect(getAllBookings()).rejects.toThrow(/Failed to get bookings/);
    });

    it('ERR-GAB-2: DB query (exec) rejects', async () => {
      const q: any = makeQuery([]);
      q.exec = jest.fn().mockRejectedValue(new Error('db failure'));
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      await expect(getAllBookings()).rejects.toThrow(/Failed to get bookings/);
    });

    it('ERR-GAB-3: countDocuments rejects', async () => {
      const q = makeQuery([]);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockRejectedValueOnce(new Error('count failure'));

      await expect(getAllBookings()).rejects.toThrow(/Failed to get bookings/);
    });

    // ---------------- Integration-like (1) ----------------
    it('INT-GAB-1: end-to-end with status filter and pagination', async () => {
      const docs = [{ _id: 'b1' }, { _id: 'b2' }];
      const q = makeQuery(docs);
      (Booking.find as jest.Mock).mockReturnValueOnce(q);
      (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(7);

      const res = await getAllBookings(3, 2, 'PENDING');

      expect(Booking.find).toHaveBeenCalledWith({ status: 'PENDING' });
      expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
      expect(q.skip).toHaveBeenCalledWith(4);
      expect(q.limit).toHaveBeenCalledWith(2);
      expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(q.exec).toHaveBeenCalledTimes(1);
      expect(Booking.countDocuments).toHaveBeenCalledWith({ status: 'PENDING' });
      expect(res.bookings).toHaveLength(2);
      expect(res.total).toBe(7);
      expect(res.page).toBe(3);
      expect(res.totalPages).toBe(4);
    });
  });
  // ---------------- Happy paths (5) ----------------
  it('HP-GBI-1: returns formatted booking when found', async () => {
    const dto = { id: 'b-1', ok: true };
    (formatBookingResponse as jest.Mock).mockReturnValueOnce(dto);

    const res = await getBookingById(bookingId);

    expect(Booking.findById).toHaveBeenCalledWith(bookingId);
    expect(formatBookingResponse).toHaveBeenCalledTimes(1);
    expect(res).toEqual(dto);
  });

  it('HP-GBI-2: populates related refs before formatting', async () => {
    const q = makeQuery({ _id: bookingId });
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    await getBookingById(bookingId);

    expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(formatBookingResponse).toHaveBeenCalled();
  });

  it('HP-GBI-3: forwards string ObjectId correctly to DB', async () => {
    const id = 'abc123xyz';
    const q = makeQuery({ _id: id });
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    await getBookingById(id);
    expect(Booking.findById).toHaveBeenCalledWith(id);
    expect(q.exec).toHaveBeenCalledTimes(1);
  });

  it('HP-GBI-4: respects formatter output shape', async () => {
    const dto = { id: 'shape-check', customerName: 'Alice', status: 'CONFIRMED' };
    (formatBookingResponse as jest.Mock).mockReturnValueOnce(dto);

    const res = await getBookingById(bookingId);
    expect(res).toEqual(dto);
  });

  it('HP-GBI-5: makes only one DB fetch (findById/exec)', async () => {
    const q = makeQuery({ _id: bookingId });
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    await getBookingById(bookingId);

    expect(Booking.findById).toHaveBeenCalledTimes(1);
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(Booking.find).not.toHaveBeenCalled();
    expect(Booking.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  // ---------------- Edge cases (3) ----------------
  it('EDGE-GBI-1: returns null when booking not found', async () => {
    const q = makeQuery(null);
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    const res = await getBookingById('missing');

    expect(res).toBeNull();
    expect(formatBookingResponse).not.toHaveBeenCalled();
  });

  it('EDGE-GBI-2: empty ID gracefully handled (returns null)', async () => {
    const q = makeQuery(null);
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    const res = await getBookingById('');
    expect(Booking.findById).toHaveBeenCalledWith('');
    expect(res).toBeNull();
  });

  it('EDGE-GBI-3: minimal booking doc still formats', async () => {
    const minimal = { _id: 'min-1' } as any;
    const q = makeQuery(minimal);
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    const res = await getBookingById('min-1');
    expect(formatBookingResponse).toHaveBeenCalledWith(minimal);
    expect(res).toEqual(expect.any(Object));
  });

  // ---------------- Errors (3) ----------------
  it('ERR-GBI-1: formatter throws → wrapped error surfaced', async () => {
    const doc = { _id: 'b-err-1' };
    const q = makeQuery(doc);
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);
    (formatBookingResponse as jest.Mock).mockImplementationOnce(() => {
      throw new Error('format fail');
    });

    await expect(getBookingById('b-err-1')).rejects.toThrow(/Failed to get booking/);
  });

  it('ERR-GBI-2: DB exec rejects', async () => {
    const q: any = makeQuery(null);
    q.exec = jest.fn().mockRejectedValue(new Error('db failure'));
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    await expect(getBookingById('b-err-2')).rejects.toThrow(/Failed to get booking/);
  });

  it('ERR-GBI-3: populate throws synchronously', async () => {
    const q: any = makeQuery({ _id: 'b-err-3' });
    q.populate = jest.fn(() => { throw new Error('populate fail'); });
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    await expect(getBookingById('b-err-3')).rejects.toThrow(/Failed to get booking/);
    expect(q.exec).not.toHaveBeenCalled();
  });

  // ---------------- Integration-like (1) ----------------
  it('INT-GBI-1: chained query with populate → exec → formatter interaction', async () => {
    const doc = { _id: 'int-1', status: 'CONFIRMED' } as any;
    const q = makeQuery(doc);
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);
    const dto = { id: 'int-1', status: 'CONFIRMED' };
    (formatBookingResponse as jest.Mock).mockReturnValueOnce(dto);

    const res = await getBookingById('int-1');

    expect(q.populate).toHaveBeenCalled();
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(formatBookingResponse).toHaveBeenCalledWith(doc);
    expect(res).toEqual(dto);
  });
});

describe('getBookingsByCustomer - tests (Happy → Edge → Error → Integration)', () => {
  const customerId = 'c-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (Booking.find as jest.Mock).mockReturnValue(makeQuery([]));
    (Booking.countDocuments as jest.Mock).mockResolvedValue(0);
  });

  // ---------------- Happy paths (5) ----------------
  it('HP-GBC-1: returns formatted bookings and correct pagination defaults', async () => {
    const docs = [
      { _id: 'b1', bookingDate: new Date() },
      { _id: 'b2', bookingDate: new Date() },
    ];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(2);

    const res = await getBookingsByCustomer(customerId);

    expect(Booking.find).toHaveBeenCalledWith({ customerId });
    expect(Booking.countDocuments).toHaveBeenCalledWith({ customerId });
    expect(res.page).toBe(1);
    expect(res.total).toBe(2);
    expect(res.totalPages).toBe(1);
    expect(res.bookings).toHaveLength(2);
    expect(formatBookingResponse).toHaveBeenCalledTimes(2);
  });

  it('HP-GBC-2: applies customerId filter to both find and count', async () => {
    const cid = 'c-2';
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    await getBookingsByCustomer(cid);

    expect(Booking.find).toHaveBeenCalledWith({ customerId: cid });
    expect(Booking.countDocuments).toHaveBeenCalledWith({ customerId: cid });
  });

  it('HP-GBC-3: respects skip/limit from page and pageSize', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    await getBookingsByCustomer(customerId, 3, 4);

    expect(q.skip).toHaveBeenCalledWith(8);
    expect(q.limit).toHaveBeenCalledWith(4);
  });

  it('HP-GBC-4: sorts by bookingDate descending', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    await getBookingsByCustomer(customerId, 1, 10);

    expect(q.sort).toHaveBeenCalledWith({ bookingDate: -1 });
  });

  it('HP-GBC-5: populates relations before mapping', async () => {
    const docs = [{ _id: 'b1' }, { _id: 'b2' }];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(2);

    await getBookingsByCustomer(customerId, 1, 10);

    expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(formatBookingResponse).toHaveBeenCalledTimes(2);
  });

  // ---------------- Edge cases (3) ----------------
  it('EDGE-GBC-1: empty list yields empty results/zero totals', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    const res = await getBookingsByCustomer(customerId, 1, 10);

    expect(res.bookings).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.totalPages).toBe(0);
    expect(formatBookingResponse).not.toHaveBeenCalled();
  });

  it('EDGE-GBC-2: single-item page size produces correct totalPages', async () => {
    const q = makeQuery([{ _id: 'only' }]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(5);

    const res = await getBookingsByCustomer(customerId, 1, 1);
    expect(res.totalPages).toBe(5);
  });

  it('EDGE-GBC-3: page beyond last returns empty page but preserves metadata', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(6);

    const res = await getBookingsByCustomer(customerId, 4, 2);
    expect(res.bookings).toHaveLength(0);
    expect(res.total).toBe(6);
    expect(res.page).toBe(4);
    expect(res.totalPages).toBe(3);
  });

  // ---------------- Errors (3) ----------------
  it('ERR-GBC-1: formatter throws for an item → wrapped error', async () => {
    const docs = [{ _id: 'b1' }];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(1);
    (formatBookingResponse as jest.Mock).mockImplementationOnce(() => {
      throw new Error('format fail');
    });

    await expect(getBookingsByCustomer(customerId)).rejects.toThrow(/Failed to get customer bookings/);
  });

  it('ERR-GBC-2: DB query (exec) rejects', async () => {
    const q: any = makeQuery([]);
    q.exec = jest.fn().mockRejectedValue(new Error('db failure'));
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    await expect(getBookingsByCustomer(customerId)).rejects.toThrow(/Failed to get customer bookings/);
  });

  it('ERR-GBC-3: countDocuments rejects', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockRejectedValueOnce(new Error('count failure'));

    await expect(getBookingsByCustomer(customerId)).rejects.toThrow(/Failed to get customer bookings/);
  });

  // ---------------- Integration-like (1) ----------------
  it('INT-GBC-1: end-to-end flow with pagination and mapping', async () => {
    const docs = [{ _id: 'b1' }, { _id: 'b2' }, { _id: 'b3' }];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(9);

    const res = await getBookingsByCustomer('c-int', 2, 3);

    expect(Booking.find).toHaveBeenCalledWith({ customerId: 'c-int' });
    expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
    expect(q.skip).toHaveBeenCalledWith(3);
    expect(q.limit).toHaveBeenCalledWith(3);
    expect(q.sort).toHaveBeenCalledWith({ bookingDate: -1 });
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(Booking.countDocuments).toHaveBeenCalledWith({ customerId: 'c-int' });
    expect(res.bookings).toHaveLength(3);
    expect(res.total).toBe(9);
    expect(res.page).toBe(2);
    expect(res.totalPages).toBe(3);
  });
});

describe('getBookingsByMUA - tests (Happy → Edge → Error → Integration)', () => {
  const muaId = 'm-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (Booking.find as jest.Mock).mockReturnValue(makeQuery([]));
    (Booking.countDocuments as jest.Mock).mockResolvedValue(0);
  });

  // ---------------- Happy paths (5) ----------------
  it('HP-GBM-1: returns formatted bookings and correct pagination defaults', async () => {
    const docs = [
      { _id: 'b1', bookingDate: new Date() },
      { _id: 'b2', bookingDate: new Date() },
    ];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(2);

    const res = await getBookingsByMUA(muaId);

    expect(Booking.find).toHaveBeenCalledWith({ muaId });
    expect(Booking.countDocuments).toHaveBeenCalledWith({ muaId });
    expect(res.page).toBe(1);
    expect(res.total).toBe(2);
    expect(res.totalPages).toBe(1);
    expect(res.bookings).toHaveLength(2);
    expect(formatBookingResponse).toHaveBeenCalledTimes(2);
  });

  it('HP-GBM-2: applies muaId filter to both find and count', async () => {
    const mid = 'm-2';
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    await getBookingsByMUA(mid);

    expect(Booking.find).toHaveBeenCalledWith({ muaId: mid });
    expect(Booking.countDocuments).toHaveBeenCalledWith({ muaId: mid });
  });

  it('HP-GBM-3: respects skip/limit from page and pageSize', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    await getBookingsByMUA(muaId, 2, 5);

    expect(q.skip).toHaveBeenCalledWith(5);
    expect(q.limit).toHaveBeenCalledWith(5);
  });

  it('HP-GBM-4: sorts by bookingDate descending', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    await getBookingsByMUA(muaId, 1, 10);

    expect(q.sort).toHaveBeenCalledWith({ bookingDate: -1 });
  });

  it('HP-GBM-5: populates relations before mapping', async () => {
    const docs = [{ _id: 'b1' }, { _id: 'b2' }];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(2);

    await getBookingsByMUA(muaId, 1, 10);

    expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(formatBookingResponse).toHaveBeenCalledTimes(2);
  });

  // ---------------- Edge cases (3) ----------------
  it('EDGE-GBM-1: empty list yields empty results/zero totals', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    const res = await getBookingsByMUA(muaId, 1, 10);

    expect(res.bookings).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.totalPages).toBe(0);
    expect(formatBookingResponse).not.toHaveBeenCalled();
  });

  it('EDGE-GBM-2: single-item page size produces correct totalPages', async () => {
    const q = makeQuery([{ _id: 'only' }]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(4);

    const res = await getBookingsByMUA(muaId, 1, 1);
    expect(res.totalPages).toBe(4);
  });

  it('EDGE-GBM-3: page beyond last returns empty page but preserves metadata', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(6);

    const res = await getBookingsByMUA(muaId, 5, 2);
    expect(res.bookings).toHaveLength(0);
    expect(res.total).toBe(6);
    expect(res.page).toBe(5);
    expect(res.totalPages).toBe(3);
  });

  // ---------------- Errors (3) ----------------
  it('ERR-GBM-1: formatter throws for an item → wrapped error', async () => {
    const docs = [{ _id: 'b1' }];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(1);
    (formatBookingResponse as jest.Mock).mockImplementationOnce(() => {
      throw new Error('format fail');
    });

    await expect(getBookingsByMUA(muaId)).rejects.toThrow(/Failed to get MUA bookings/);
  });

  it('ERR-GBM-2: DB query (exec) rejects', async () => {
    const q: any = makeQuery([]);
    q.exec = jest.fn().mockRejectedValue(new Error('db failure'));
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(0);

    await expect(getBookingsByMUA(muaId)).rejects.toThrow(/Failed to get MUA bookings/);
  });

  it('ERR-GBM-3: countDocuments rejects', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockRejectedValueOnce(new Error('count failure'));

    await expect(getBookingsByMUA(muaId)).rejects.toThrow(/Failed to get MUA bookings/);
  });

  // ---------------- Integration-like (1) ----------------
  it('INT-GBM-1: end-to-end flow with pagination and mapping', async () => {
    const docs = [{ _id: 'b1' }, { _id: 'b2' }];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (Booking.countDocuments as jest.Mock).mockResolvedValueOnce(5);

    const res = await getBookingsByMUA('m-int', 2, 2);

    expect(Booking.find).toHaveBeenCalledWith({ muaId: 'm-int' });
    expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
    expect(q.skip).toHaveBeenCalledWith(2);
    expect(q.limit).toHaveBeenCalledWith(2);
    expect(q.sort).toHaveBeenCalledWith({ bookingDate: -1 });
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(Booking.countDocuments).toHaveBeenCalledWith({ muaId: 'm-int' });
    expect(res.bookings).toHaveLength(2);
    expect(res.total).toBe(5);
    expect(res.page).toBe(2);
    expect(res.totalPages).toBe(3);
  });
});

describe('getBookingsByDate - tests (Happy → Edge → Error → Integration)', () => {
  const date = '2024-01-01';

  beforeEach(() => {
    jest.clearAllMocks();
    (Booking.find as jest.Mock).mockReturnValue(makeQuery([]));
  });

  // ---------------- Happy paths (5) ----------------
  it('HP-GBD-1: returns formatted bookings for a given date', async () => {
    const docs = [
      { _id: 'b1', bookingDate: new Date('2024-01-01T09:00:00Z') },
      { _id: 'b2', bookingDate: new Date('2024-01-01T10:00:00Z') },
    ];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    const res = await getBookingsByDate(date);

    expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({
      bookingDate: expect.objectContaining({ $gte: expect.any(Date), $lte: expect.any(Date) })
    }));
    expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
    expect(q.sort).toHaveBeenCalledWith({ bookingDate: 1 });
    expect(res).toHaveLength(2);
    expect(formatBookingResponse).toHaveBeenCalledTimes(2);
  });

  it('HP-GBD-2: includes muaId in filter when provided', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    await getBookingsByDate(date, 'm-1');
    expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({ muaId: 'm-1' }));
  });

  it('HP-GBD-3: sorts ascending by bookingDate', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    await getBookingsByDate(date);
    expect(q.sort).toHaveBeenCalledWith({ bookingDate: 1 });
  });

  it('HP-GBD-4: populates relations before mapping', async () => {
    const q = makeQuery([{ _id: 'b1' }]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    await getBookingsByDate(date);
    expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(formatBookingResponse).toHaveBeenCalledTimes(1);
  });

  it('HP-GBD-5: builds a date range filter ($gte/$lte)', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    await getBookingsByDate(date);

    const callArg = (Booking.find as jest.Mock).mock.calls[0][0];
    expect(callArg.bookingDate.$gte instanceof Date).toBe(true);
    expect(callArg.bookingDate.$lte instanceof Date).toBe(true);
  });

  // ---------------- Edge cases (3) ----------------
  it('EDGE-GBD-1: empty list yields empty array and no formatting', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    const res = await getBookingsByDate(date);
    expect(res).toEqual([]);
    expect(formatBookingResponse).not.toHaveBeenCalled();
  });

  it('EDGE-GBD-2: date string with time component is handled', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    await getBookingsByDate('2024-01-01T12:34:56Z');
    expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({ bookingDate: expect.any(Object) }));
  });

  it('EDGE-GBD-3: with muaId and no results returns empty array', async () => {
    const q = makeQuery([]);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    const res = await getBookingsByDate(date, 'm-none');
    expect(res).toEqual([]);
    expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({ muaId: 'm-none' }));
  });

  // ---------------- Errors (3) ----------------
  it('ERR-GBD-1: formatter throws → wrapped error surfaced', async () => {
    const docs = [{ _id: 'b1' }];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);
    (formatBookingResponse as jest.Mock).mockImplementationOnce(() => { throw new Error('format fail'); });

    await expect(getBookingsByDate(date)).rejects.toThrow(/Failed to get bookings by date/);
  });

  it('ERR-GBD-2: DB exec rejects', async () => {
    const q: any = makeQuery([]);
    q.exec = jest.fn().mockRejectedValue(new Error('db failure'));
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    await expect(getBookingsByDate(date)).rejects.toThrow(/Failed to get bookings by date/);
  });

  it('ERR-GBD-3: populate throws synchronously', async () => {
    const q: any = makeQuery([]);
    q.populate = jest.fn(() => { throw new Error('populate fail'); });
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    await expect(getBookingsByDate(date)).rejects.toThrow(/Failed to get bookings by date/);
    expect(q.exec).not.toHaveBeenCalled();
  });

  // ---------------- Integration-like (1) ----------------
  it('INT-GBD-1: end-to-end query with muaId and mapping', async () => {
    const docs = [{ _id: 'b1' }, { _id: 'b2' }];
    const q = makeQuery(docs);
    (Booking.find as jest.Mock).mockReturnValueOnce(q);

    const res = await getBookingsByDate('2024-02-10', 'm-123');

    expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({
      bookingDate: expect.any(Object),
      muaId: 'm-123'
    }));
    expect(q.populate).toHaveBeenCalledWith('customerId serviceId');
    expect(q.sort).toHaveBeenCalledWith({ bookingDate: 1 });
    expect(q.exec).toHaveBeenCalledTimes(1);
    expect(res).toHaveLength(2);
  });
});