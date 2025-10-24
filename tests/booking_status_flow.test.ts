import mongoose from 'mongoose';
import { Booking } from '../src/models';
import * as slotService from '../src/services/slot.service';
import { updateBookingStatus, markBookingCompleted, cancelBooking } from '../src/services/booking.service';
import { formatBookingResponse } from '../src/utils/booking.formatter';
import * as bookingConsts from '../src/constants/booking';

// keep tests concise — each test follows Arrange / Act / Assert

describe('updateBookingStatus flow', () => {
  const origModel = mongoose.model;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
    mongoose.model = origModel;
  });

  test('HP-1: returns formatted DTO when booking updated and no transaction exists (CANCELLED)', async () => {
    const updatedBooking: any = {
      _id: 'b1',
      muaId: 'm1',
      bookingDate: new Date('2025-01-01T09:00:00Z'),
      customerId: { _id: 'c1', fullName: 'Customer One' },
      serviceId: { _id: 's1', name: 'Service One', price: 100 },
      duration: 60,
      status: 'CANCELLED',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({
      populate: () => ({ exec: () => Promise.resolve(updatedBooking) })
    } as any);

    const transactionFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) });
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => ({ findOne: transactionFindOne } as any));

    const invalidateSpy = jest.spyOn(slotService, 'invalidateWeeklyCache').mockResolvedValue(undefined as any);

    const res = await updateBookingStatus('b1', 'CANCELLED');

    expect(res?._id).toEqual('b1');
    expect(res?.status).toEqual('CANCELLED');
    expect(invalidateSpy).toHaveBeenCalledWith('m1', expect.anything());
    expect(transactionFindOne).toHaveBeenCalledWith({ bookingId: 'b1' });
  });

  test('HP-2: CONFIRMED - captures transaction and updates wallet balance', async () => {
    const updatedBooking: any = {
      _id: 'b2',
      muaId: 'm2',
      bookingDate: new Date('2025-02-01T10:00:00Z'),
      customerId: { _id: 'c2', fullName: 'Cust2' },
      serviceId: { _id: 's2', name: 'S2', price: 100 },
      duration: 30,
      status: 'CONFIRMED',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({
      populate: () => ({ exec: () => Promise.resolve(updatedBooking) })
    } as any);

    const transactionMock: any = { status: 'PENDING', amount: 100, save: jest.fn().mockResolvedValue(true) };
    const walletMock: any = { balance: 50, save: jest.fn().mockResolvedValue(true) };

    const transactionFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(transactionMock) });
    const walletFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(walletMock) });

    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => {
      if (name === 'Transaction') return { findOne: transactionFindOne } as any;
      if (name === 'Wallet') return { findOne: walletFindOne } as any;
      return origModel(name);
    });

    jest.spyOn(slotService, 'invalidateWeeklyCache').mockResolvedValue(undefined as any);

    const res = await updateBookingStatus('b2', 'CONFIRMED');

    expect(res?._id).toEqual('b2');
    expect(transactionMock.status).toEqual('CAPTURED');
    expect(transactionMock.save).toHaveBeenCalled();
    expect(walletMock.balance).toEqual(150);
    expect(walletMock.save).toHaveBeenCalled();
  });

  test('HP-3: booking without muaId or bookingDate skips cache invalidation and returns DTO', async () => {
    const updatedBooking: any = { _id: 'b3', muaId: null, bookingDate: undefined, customerId: {}, serviceId: {}, duration: 0, status: 'PENDING' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(updatedBooking) }) } as any);

    const invalidateSpy = jest.spyOn(slotService, 'invalidateWeeklyCache').mockResolvedValue(undefined as any);
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => ({ findOne: jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) }) } as any));

    const res = await updateBookingStatus('b3', 'PENDING');
    expect(res?._id).toEqual('b3');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test('HP-4: transaction exists but status not CONFIRMED -> transaction not captured', async () => {
    const updatedBooking: any = { _id: 'b4', muaId: 'm4', bookingDate: new Date(), customerId: {}, serviceId: {}, duration: 0, status: 'CANCELLED' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(updatedBooking) }) } as any);

    const transactionMock: any = { status: 'PENDING', save: jest.fn() };
    const transactionFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(transactionMock) });
    const walletFindOne = jest.fn();
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => {
      if (name === 'Transaction') return { findOne: transactionFindOne } as any;
      if (name === 'Wallet') return { findOne: walletFindOne } as any;
      return origModel(name);
    });

    const res = await updateBookingStatus('b4', 'CANCELLED');
    expect(res?._id).toEqual('b4');
    expect(transactionMock.save).not.toHaveBeenCalled();
    expect(walletFindOne).not.toHaveBeenCalled();
  });

  test('HP-5: inner invalidate/transaction errors are swallowed and function still returns DTO', async () => {
    const updatedBooking: any = { _id: 'b5', muaId: 'm5', bookingDate: new Date(), customerId: {}, serviceId: {}, duration: 0, status: 'PENDING' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(updatedBooking) }) } as any);

    jest.spyOn(slotService, 'invalidateWeeklyCache').mockRejectedValue(new Error('boom') as any);
    const transactionFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) });
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => ({ findOne: transactionFindOne } as any));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await updateBookingStatus('b5', 'PENDING');
    expect(res?._id).toEqual('b5');
    expect(warnSpy).toHaveBeenCalled();
  });

  test('EC-1: Booking.findByIdAndUpdate throws -> outer error is propagated', async () => {
    jest.spyOn(Booking, 'findByIdAndUpdate').mockImplementation((() => { throw new Error('DB cast error'); }) as any);
    await expect(updateBookingStatus('', 'CONFIRMED')).rejects.toThrow('Failed to update booking status:');
  });

  test('EC-2: transaction exists but wallet not found -> transaction saved and no wallet.save', async () => {
    const updatedBooking: any = { _id: 'b6', muaId: 'm6', bookingDate: new Date(), customerId: {}, serviceId: {}, duration: 0, status: 'CONFIRMED' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(updatedBooking) }) } as any);

    const transactionMock: any = { status: 'PENDING', amount: 75, save: jest.fn().mockResolvedValue(true) };
    const transactionFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(transactionMock) });
    const walletFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) });
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => {
      if (name === 'Transaction') return { findOne: transactionFindOne } as any;
      if (name === 'Wallet') return { findOne: walletFindOne } as any;
      return origModel(name);
    });

    const res = await updateBookingStatus('b6', 'CONFIRMED');
    expect(res?._id).toEqual('b6');
    expect(transactionMock.save).toHaveBeenCalled();
  });

  test('EC-3: bookingDate invalid string and invalidate throws -> still returns DTO', async () => {
    const updatedBooking: any = { _id: 'b7', muaId: 'm7', bookingDate: 'not-a-date', customerId: {}, serviceId: {}, duration: 0, status: 'PENDING' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(updatedBooking) }) } as any);
    jest.spyOn(slotService, 'invalidateWeeklyCache').mockRejectedValue(new Error('bad date') as any);
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => ({ findOne: jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) }) } as any));

    const res = await updateBookingStatus('b7', 'PENDING');
    expect(res?._id).toEqual('b7');
  });

  test('ERR-2: transaction.save throws -> swallowed and returns DTO', async () => {
    const updatedBooking: any = { _id: 'e2', muaId: 'm8', bookingDate: new Date(), customerId: {}, serviceId: {}, duration: 0, status: 'CONFIRMED' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(updatedBooking) }) } as any);

    const transactionMock: any = { status: 'PENDING', amount: 20, save: jest.fn().mockRejectedValue(new Error('save fail')) };
    const transactionFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(transactionMock) });
    const walletFindOne = jest.fn();
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => ({ findOne: transactionFindOne } as any));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await updateBookingStatus('e2', 'CONFIRMED');
    expect(res?._id).toEqual('e2');
    expect(warnSpy).toHaveBeenCalled();
  });

  test('ERR-3: wallet.save throws -> swallowed and returns DTO', async () => {
    const updatedBooking: any = { _id: 'e3', muaId: 'm9', bookingDate: new Date(), customerId: {}, serviceId: {}, duration: 0, status: 'CONFIRMED' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(updatedBooking) }) } as any);

    const transactionMock: any = { status: 'PENDING', amount: 40, save: jest.fn().mockResolvedValue(true) };
    const walletMock: any = { balance: 10, save: jest.fn().mockRejectedValue(new Error('wallet save fail')) };
    const transactionFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(transactionMock) });
    const walletFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(walletMock) });
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => {
      if (name === 'Transaction') return { findOne: transactionFindOne } as any;
      if (name === 'Wallet') return { findOne: walletFindOne } as any;
      return origModel(name);
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await updateBookingStatus('e3', 'CONFIRMED');
    expect(res?._id).toEqual('e3');
    expect(transactionMock.save).toHaveBeenCalled();
    expect(walletFindOne).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  test('INT-1: full happy path sequence — invalidate, capture transaction, update wallet', async () => {
    const updatedBooking: any = {
      _id: 'i1',
      muaId: 'mi1',
      bookingDate: new Date('2025-03-10T08:00:00Z'),
      customerId: { _id: 'ci1', fullName: 'CI' },
      serviceId: { _id: 'si1', name: 'Svc' },
      duration: 45,
      status: 'CONFIRMED'
    };

    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(updatedBooking) }) } as any);

    const transactionMock: any = { status: 'PENDING', amount: 200, save: jest.fn().mockResolvedValue(true) };
    const walletMock: any = { balance: 300, save: jest.fn().mockResolvedValue(true) };

    const transactionFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(transactionMock) });
    const walletFindOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve(walletMock) });
    jest.spyOn(mongoose, 'model').mockImplementation((name: string) => {
      if (name === 'Transaction') return { findOne: transactionFindOne } as any;
      if (name === 'Wallet') return { findOne: walletFindOne } as any;
      return origModel(name);
    });

    const invalidateSpy = jest.spyOn(slotService, 'invalidateWeeklyCache').mockResolvedValue(undefined as any);

    const res = await updateBookingStatus('i1', 'CONFIRMED');

    expect(invalidateSpy).toHaveBeenCalledWith('mi1', expect.anything());
    expect(transactionFindOne).toHaveBeenCalledWith({ bookingId: 'i1' });
    expect(transactionMock.save).toHaveBeenCalled();
    expect(walletMock.balance).toEqual(500);
    expect(walletMock.save).toHaveBeenCalled();
    expect(res?._id).toEqual('i1');
  });
});

// Additional tests for markBookingCompleted
describe('markBookingCompleted flow', () => {
  const origIsValid = mongoose.Types.ObjectId.isValid;

  afterEach(() => {
    jest.restoreAllMocks();
    mongoose.Types.ObjectId.isValid = origIsValid;
  });

  test('HP-1: completes a confirmed booking whose end time is in the past', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

    const booking: any = { _id: 'mb1', muaId: 'm1', status: bookingConsts.BOOKING_STATUS.CONFIRMED, bookingDate: new Date('2020-01-01T10:00:00Z'), duration: 60 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    jest.spyOn(bookingConsts, 'hasBookingEnded').mockReturnValue(true as any);

    const updated: any = { _id: 'mb1', status: bookingConsts.BOOKING_STATUS.COMPLETED, completedAt: new Date('2025-01-01T12:00:00Z') };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ exec: () => Promise.resolve(updated) } as any);

    const res = await markBookingCompleted('mb1', 'm1');
    expect(res._id).toEqual('mb1');
    expect(res.status).toEqual(bookingConsts.BOOKING_STATUS.COMPLETED);
  });

  test('HP-2: owner check works with ObjectId-like muaId (toString)', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    const muaObj = { toString: () => 'ownerId' };
    const booking: any = { _id: 'mb2', muaId: muaObj, status: bookingConsts.BOOKING_STATUS.CONFIRMED, bookingDate: new Date('2020-01-01T10:00:00Z'), duration: 30 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    jest.spyOn(bookingConsts, 'hasBookingEnded').mockReturnValue(true as any);
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ exec: () => Promise.resolve({ _id: 'mb2', status: bookingConsts.BOOKING_STATUS.COMPLETED, completedAt: new Date() }) } as any);

    const res = await markBookingCompleted('mb2', 'ownerId');
    expect(res.status).toEqual(bookingConsts.BOOKING_STATUS.COMPLETED);
  });

  test('HP-3: returned completedAt preserved from DB', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    const booking: any = { _id: 'mb3', muaId: 'm3', status: bookingConsts.BOOKING_STATUS.CONFIRMED, bookingDate: new Date('2020-01-01T10:00:00Z'), duration: 10 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    jest.spyOn(bookingConsts, 'hasBookingEnded').mockReturnValue(true as any);
    const ts = new Date('2025-02-02T02:02:02Z');
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ exec: () => Promise.resolve({ _id: 'mb3', status: bookingConsts.BOOKING_STATUS.COMPLETED, completedAt: ts }) } as any);

    const res = await markBookingCompleted('mb3', 'm3');
    expect(res.completedAt).toEqual(ts);
  });

  test('HP-4: long duration booking marked completed when ended', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    const booking: any = { _id: 'mb4', muaId: 'm4', status: bookingConsts.BOOKING_STATUS.CONFIRMED, bookingDate: new Date('2010-01-01T10:00:00Z'), duration: 24 * 60 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    jest.spyOn(bookingConsts, 'hasBookingEnded').mockReturnValue(true as any);
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ exec: () => Promise.resolve({ _id: 'mb4', status: bookingConsts.BOOKING_STATUS.COMPLETED, completedAt: new Date() }) } as any);

    const res = await markBookingCompleted('mb4', 'm4');
    expect(res._id).toEqual('mb4');
  });

  test('HP-5: repeated calls return same completed result', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    const booking: any = { _id: 'mb5', muaId: 'm5', status: bookingConsts.BOOKING_STATUS.CONFIRMED, bookingDate: new Date('2019-01-01T10:00:00Z'), duration: 5 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    jest.spyOn(bookingConsts, 'hasBookingEnded').mockReturnValue(true as any);
    const updated = { _id: 'mb5', status: bookingConsts.BOOKING_STATUS.COMPLETED, completedAt: new Date() };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ exec: () => Promise.resolve(updated) } as any);

    const r1 = await markBookingCompleted('mb5', 'm5');
    const r2 = await markBookingCompleted('mb5', 'm5');
    expect(r1._id).toEqual(r2._id);
    expect(r1.status).toEqual(r2.status);
  });

  test('EC-1: booking not found -> 404 error', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(null) } as any);
    await expect(markBookingCompleted('nope', 'm1')).rejects.toMatchObject({ status: 404, code: 'booking_not_found' });
  });

  test('EC-2: owner mismatch -> 403 not_owner', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    const booking: any = { _id: 'mb6', muaId: 'ownerX', status: bookingConsts.BOOKING_STATUS.CONFIRMED, bookingDate: new Date('2020-01-01T10:00:00Z'), duration: 10 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    await expect(markBookingCompleted('mb6', 'otherY')).rejects.toMatchObject({ status: 403, code: 'not_owner' });
  });

  test('EC-3: status not CONFIRMED -> 409 invalid_status', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    const booking: any = { _id: 'mb7', muaId: 'm7', status: 'PENDING', bookingDate: new Date('2020-01-01T10:00:00Z'), duration: 5 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    await expect(markBookingCompleted('mb7', 'm7')).rejects.toMatchObject({ status: 409, code: 'invalid_status' });
  });

  test('ERR-1: invalid bookingId -> 404 booking_not_found', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
    await expect(markBookingCompleted('bad', 'm1')).rejects.toMatchObject({ status: 404, code: 'booking_not_found' });
  });

  test('ERR-2: invalid muaIdFromReq -> 401 unauthorized', async () => {
    // mockImplementation requires a function with a broader signature; cast to any to avoid TS type error
    const isValidMock = ((v: any) => v === 'validId') as any;
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockImplementation(isValidMock);
    await expect(markBookingCompleted('validId', '')).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
  });

  test('ERR-3: findByIdAndUpdate returns null -> 500 internal_error', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    const booking: any = { _id: 'mb8', muaId: 'm8', status: bookingConsts.BOOKING_STATUS.CONFIRMED, bookingDate: new Date('2020-01-01T10:00:00Z'), duration: 1 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    jest.spyOn(bookingConsts, 'hasBookingEnded').mockReturnValue(true as any);
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ exec: () => Promise.resolve(null) } as any);
    await expect(markBookingCompleted('mb8', 'm8')).rejects.toMatchObject({ status: 500, code: 'internal_error' });
  });

  test('INT-1: full flow with ObjectId-like muaId and real dates', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    const muaObj = { toString: () => 'realMuaId' };
    const booking: any = { _id: 'mb9', muaId: muaObj, status: bookingConsts.BOOKING_STATUS.CONFIRMED, bookingDate: new Date('2025-01-01T09:00:00Z'), duration: 60 };
    jest.spyOn(Booking, 'findById').mockReturnValue({ exec: () => Promise.resolve(booking) } as any);
    jest.spyOn(bookingConsts, 'hasBookingEnded').mockReturnValue(true as any);
    const completedAt = new Date('2025-10-01T10:10:00Z');
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ exec: () => Promise.resolve({ _id: 'mb9', status: bookingConsts.BOOKING_STATUS.COMPLETED, completedAt }) } as any);

    const res = await markBookingCompleted('mb9', 'realMuaId');
    expect(res._id).toEqual('mb9');
    expect(res.status).toEqual(bookingConsts.BOOKING_STATUS.COMPLETED);
    expect(res.completedAt).toEqual(completedAt);
  });
});

// Tests for cancelBooking
describe('cancelBooking flow', () => {
  afterEach(() => jest.restoreAllMocks());

  test('HP-1: successfully cancels an existing booking and returns formatted DTO', async () => {
    const doc: any = { _id: 'bc1', status: 'CANCELLED', customerId: { _id: 'cu1', fullName: 'C' }, serviceId: { _id: 's1', name: 'S' } };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);

    const res = await cancelBooking('bc1');
    expect(res?._id).toEqual('bc1');
    expect(res?.status).toEqual('CANCELLED');
    expect(res?.customerName).toEqual('C');
  });

  test('HP-2: cancelled booking with minimal fields returns DTO with defaults', async () => {
    const doc: any = { _id: 'bc2', status: 'CANCELLED' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);

    const res = await cancelBooking('bc2');
    expect(res?._id).toEqual('bc2');
    expect(res?.customerId).toEqual('');
  });

  test('HP-3: cancelling an already CANCELLED booking returns DTO (idempotent)', async () => {
    const doc: any = { _id: 'bc3', status: 'CANCELLED' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);

    const res = await cancelBooking('bc3');
    expect(res?.status).toEqual('CANCELLED');
  });

  test('HP-4: updatedAt present in DB return is reflected in DTO', async () => {
    const ts = new Date('2025-10-01T00:00:00Z');
    const doc: any = { _id: 'bc4', status: 'CANCELLED', updatedAt: ts };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);

    const res = await cancelBooking('bc4');
    expect(res?.updatedAt).toEqual(ts);
  });

  test('HP-5: populate returns populated customer/service and DTO contains their info', async () => {
    const doc: any = { _id: 'bc5', status: 'CANCELLED', customerId: { _id: 'c5', fullName: 'Cust5' }, serviceId: { _id: 's5', name: 'Svc5' } };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);

    const res = await cancelBooking('bc5');
    expect(res?.customerName).toEqual('Cust5');
    expect(res?.serviceName).toEqual('Svc5');
  });

  test('EC-1: DB returns null -> function returns null', async () => {
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(null) }) } as any);
    const res = await cancelBooking('notfound');
    expect(res).toBeNull();
  });

  test('EC-2: very long bookingId handled normally', async () => {
    const longId = 'x'.repeat(200);
    const doc: any = { _id: longId, status: 'CANCELLED' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);
    const res = await cancelBooking(longId);
    expect(res?._id).toEqual(longId);
  });

  test('EC-3: original had weird status but DB returns CANCELLED -> DTO shows CANCELLED', async () => {
    const doc: any = { _id: 'bc6', status: 'CANCELLED' };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);
    const res = await cancelBooking('bc6');
    expect(res?.status).toEqual('CANCELLED');
  });

  test('ERR-1: DB throws during findByIdAndUpdate -> propagates error', async () => {
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.reject(new Error('DB down')) }) } as any);
    await expect(cancelBooking('err1')).rejects.toThrow('Failed to cancel booking:');
  });

  test('ERR-2: populate.exec rejects -> propagates error', async () => {
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.reject(new Error('populate fail')) }) } as any);
    await expect(cancelBooking('err2')).rejects.toThrow('Failed to cancel booking:');
  });

  test('ERR-3: formatBookingResponse throws -> error bubbles up', async () => {
  const doc: any = { _id: 'bc7', status: 'CANCELLED' };
    jest.resetModules();

    // Mock the bookings model module (the path used by booking.service)
    jest.doMock('models/bookings.models', () => ({
      Booking: {
        findByIdAndUpdate: jest.fn().mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) })
      }
    }));

    // Mock the formatter module so formatBookingResponse throws
    // Service imports the formatter using '../utils/booking.formatter' relative to src/services,
    // so when requiring the service from tests the resolved path is '../src/utils/booking.formatter'
    jest.doMock('../src/utils/booking.formatter', () => ({
      formatBookingResponse: () => { throw new Error('format fail'); }
    }));

  // Require the service fresh from the module cache
  const bookingService = require('../src/services/booking.service');

  // The service wraps internal errors with `Failed to cancel booking: ...` so assert that wrapper
  await expect(bookingService.cancelBooking('bc7')).rejects.toThrow('Failed to cancel booking:');
  });

  test('INT-1: full flow with realistic booking object returns formatted shape', async () => {
    const doc: any = {
      _id: 'bc8', status: 'CANCELLED', customerId: { _id: 'c8', fullName: 'C8' }, serviceId: { _id: 's8', name: 'S8' }, bookingDate: new Date('2025-01-01T09:00:00Z')
    };
    jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);
    const res = await cancelBooking('bc8');
    expect(res?._id).toEqual('bc8');
    expect(res?.customerName).toEqual('C8');
  });
});