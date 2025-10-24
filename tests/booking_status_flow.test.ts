import mongoose from 'mongoose';
import { Booking } from '../src/models';
import * as slotService from '../src/services/slot.service';
import { updateBookingStatus } from '../src/services/booking.service';

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

// Huyen