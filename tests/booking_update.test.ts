// Jest unit tests for updateBooking in booking.service.ts

// Centralize all mocks for Booking CRUD tests
import '../src/tests-support/booking.mocks';
import { Booking, makeQuery } from '../src/tests-support/booking.mocks';

// Import SUT and mocked deps AFTER mocks are defined
import { updateBooking } from '../src/services/booking.service';
import { formatBookingResponse } from '../src/utils/booking.formatter';

describe('updateBooking - tests (Happy → Edge → Error → Integration)', () => {
  const current = {
    _id: 'b-1',
    muaId: 'm-1',
    customerId: 'c-1',
    serviceId: 's-1',
    bookingDate: new Date('2024-01-01T10:00:00Z'),
    duration: 60,
    status: 'PENDING',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default current booking exists
    (Booking.findById as jest.Mock).mockReturnValue(makeQuery({ ...current }));
    // Default: no conflict inside checker
    (Booking.find as jest.Mock).mockReturnValue(makeQuery([]));
    // Default: update returns populated doc
    (Booking.findByIdAndUpdate as jest.Mock).mockReturnValue(makeQuery({ ...current }));
  });

  // ---------------- Happy paths (3) ----------------
  it('HP-UB-1: updates non-time fields without conflict check; returns formatted', async () => {
    const updated = { ...current, address: '123 Street' };
    (Booking.findByIdAndUpdate as jest.Mock).mockReturnValueOnce(makeQuery(updated));

    const res = await updateBooking(current._id, { address: '123 Street' } as any);

    // Should not trigger conflict checker for non-time fields
    expect(Booking.find).not.toHaveBeenCalled();
    expect(formatBookingResponse).toHaveBeenCalledWith(updated);
    expect(res).toEqual(expect.any(Object));
  });

  it('HP-UB-2: updates duration; checker uses current muaId/date; formatted returned', async () => {
    const updated = { ...current, duration: 90 };
    (Booking.findByIdAndUpdate as jest.Mock).mockReturnValueOnce(makeQuery(updated));

    const res = await updateBooking(current._id, { duration: 90 } as any);

    expect(formatBookingResponse).toHaveBeenCalledWith(updated);
    expect(res).toEqual(expect.objectContaining({ duration: 90 }));
  });

  it('HP-UB-3: updates muaId and bookingDate with no conflict; mapped output', async () => {
    const updateData = { muaId: 'm-2', bookingDate: new Date('2024-01-02T09:00:00Z') } as any;
    const updated = { ...current, ...updateData };
    (Booking.findByIdAndUpdate as jest.Mock).mockReturnValueOnce(makeQuery(updated));

    const res = await updateBooking(current._id, updateData);
    expect(formatBookingResponse).toHaveBeenCalledWith(updated);
    expect(res).toEqual(expect.any(Object));
  });

  // ---------------- Edge cases (3) ----------------
  it('EDGE-UB-1: current booking not found → returns null', async () => {
    (Booking.findById as jest.Mock).mockReturnValueOnce(makeQuery(null));
    const res = await updateBooking('missing', { duration: 60 } as any);
    expect(res).toBeNull();
    expect(Booking.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('EDGE-UB-2: conflict check required data missing → throws', async () => {
    const brokenCurrent = { ...current, muaId: null };
    (Booking.findById as jest.Mock).mockReturnValueOnce(makeQuery(brokenCurrent));

    await expect(updateBooking(current._id, { bookingDate: new Date('2024-01-01T12:00:00Z') } as any))
      .rejects.toThrow(/Missing required booking data for conflict check/);
  });

  it('EDGE-UB-3: findByIdAndUpdate returns null → returns null', async () => {
    (Booking.findByIdAndUpdate as jest.Mock).mockReturnValueOnce(makeQuery(null));
    const res = await updateBooking(current._id, { address: 'A' } as any);
    expect(res).toBeNull();
  });

  // ---------------- Errors (3) ----------------
  it('ERR-UB-1: conflict detected by checker → throws', async () => {
    // Existing booking 10:00-11:00; updating to 10:30-11:30 → overlap
    const existing = { _id: 'ex-1', bookingDate: new Date('2024-01-01T10:00:00Z'), duration: 60 };
    (Booking.find as jest.Mock).mockReturnValueOnce(makeQuery([existing]));

    await expect(updateBooking(current._id, { duration: 60, bookingDate: new Date('2024-01-01T10:30:00Z') } as any))
      .rejects.toThrow(/Booking conflict detected/);
  });

  it('ERR-UB-2: DB error during update exec is wrapped', async () => {
    const q: any = makeQuery({});
    q.exec = jest.fn().mockRejectedValue(new Error('db failure'));
    (Booking.findByIdAndUpdate as jest.Mock).mockReturnValueOnce(q);

    await expect(updateBooking(current._id, { address: 'X' } as any))
      .rejects.toThrow(/Failed to update booking/);
  });

  it('ERR-UB-3: DB error during findById exec is wrapped', async () => {
    const q: any = makeQuery(null);
    q.exec = jest.fn().mockRejectedValue(new Error('db failure'));
    (Booking.findById as jest.Mock).mockReturnValueOnce(q);

    await expect(updateBooking(current._id, { address: 'X' } as any))
      .rejects.toThrow(/Failed to update booking/);
  });

  // ---------------- Integration-like (1) ----------------
  it('INT-UB-1: deterministic behavior independent of unrelated global state', async () => {
    const updated = { ...current, address: 'Stable' };
    (Booking.findByIdAndUpdate as jest.Mock).mockReturnValue(makeQuery(updated));

    const r1 = await updateBooking(current._id, { address: 'Stable' } as any);
    (global as any).cart = { items: [{ id: 'x', qty: 1 }] };
    const r2 = await updateBooking(current._id, { address: 'Stable' } as any);

    expect(r1).toEqual(r2);
  });
});
