// Huy 2
// Test cases for service functions: getAllBookings, getBookingsByCustomer, getBookingsByMUA, createRedisPendingBooking

import * as bookingService from '../src/services/booking.service';
import { Booking } from '../src/models/bookings.models';

// ==================== TEST SUITE: getAllBookings (Service Layer) ====================
describe('getAllBookings (Service)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  // ========== HAPPY PATH SCENARIOS (5 tests) ==========

  test('HP-1: Default pagination (page=1, pageSize=10, no status filter)', async () => {
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'c1', fullName: 'Alice' }, serviceId: { _id: 's1', name: 'Service1' }, status: 'PENDING' },
      { _id: 'b2', customerId: { _id: 'c2', fullName: 'Bob' }, serviceId: { _id: 's2', name: 'Service2' }, status: 'CONFIRMED' },
      { _id: 'b3', customerId: { _id: 'c3', fullName: 'Charlie' }, serviceId: { _id: 's3', name: 'Service3' }, status: 'COMPLETED' }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(3);

    const result = await bookingService.getAllBookings(1, 10);

    expect(mockFind).toHaveBeenCalledWith({});
    expect(mockPopulate).toHaveBeenCalledWith('customerId serviceId');
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result.bookings).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  test('HP-2: Custom pagination (page=2, pageSize=5)', async () => {
    const mockBookings = [
      { _id: 'b6', customerId: { _id: 'c6', fullName: 'User6' }, serviceId: { _id: 's6', name: 'Service6' }, status: 'COMPLETED' }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(15);

    const result = await bookingService.getAllBookings(2, 5);

    expect(mockSkip).toHaveBeenCalledWith(5);
    expect(mockLimit).toHaveBeenCalledWith(5);
    expect(result.bookings).toHaveLength(1);
    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
  });

  test('HP-3: Filter by status (status=CONFIRMED)', async () => {
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'c1', fullName: 'Alice' }, serviceId: { _id: 's1', name: 'Service1' }, status: 'CONFIRMED' },
      { _id: 'b2', customerId: { _id: 'c2', fullName: 'Bob' }, serviceId: { _id: 's2', name: 'Service2' }, status: 'CONFIRMED' },
      { _id: 'b3', customerId: { _id: 'c3', fullName: 'Charlie' }, serviceId: { _id: 's3', name: 'Service3' }, status: 'CONFIRMED' }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(3);

    const result = await bookingService.getAllBookings(1, 10, 'CONFIRMED');

    expect(mockFind).toHaveBeenCalledWith({ status: 'CONFIRMED' });
    expect(result.bookings).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  test('HP-4: Combined filters (page=3, pageSize=20, status=PENDING)', async () => {
    const mockBookings: any[] = [];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(45);

    const result = await bookingService.getAllBookings(3, 20, 'PENDING');

    expect(mockFind).toHaveBeenCalledWith({ status: 'PENDING' });
    expect(mockSkip).toHaveBeenCalledWith(40);
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result.bookings).toHaveLength(0);
    expect(result.total).toBe(45);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
  });

  test('HP-5: Empty result set (no bookings in database)', async () => {
    const mockBookings: any[] = [];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(0);

    const result = await bookingService.getAllBookings(1, 10);

    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(0);
  });

  // ========== EDGE CASES (3 tests) ==========

  test('EDGE-1: Page=0 (boundary value)', async () => {
    const mockBookings = Array(10).fill(null).map((_, i) => ({
      _id: `b${i}`,
      customerId: { _id: `c${i}`, fullName: `User${i}` },
      serviceId: { _id: `s${i}`, name: `Service${i}` },
      status: 'PENDING'
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(10);

    const result = await bookingService.getAllBookings(0, 10);

    expect(mockSkip).toHaveBeenCalledWith(-10);
    expect(result.page).toBe(0);
    expect(result.bookings).toHaveLength(10);
  });

  test('EDGE-2: Very large pageSize (pageSize=1000)', async () => {
    const mockBookings = Array(1000).fill(null).map((_, i) => ({
      _id: `b${i}`,
      customerId: { _id: `c${i}`, fullName: `User${i}` },
      serviceId: { _id: `s${i}`, name: `Service${i}` },
      status: 'PENDING'
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(1000);

    const result = await bookingService.getAllBookings(1, 1000);

    expect(mockLimit).toHaveBeenCalledWith(1000);
    expect(result.bookings).toHaveLength(1000);
    expect(result.total).toBe(1000);
    expect(result.totalPages).toBe(1);
  });

  test('EDGE-3: Exact page boundary (total=30, pageSize=10, page=3)', async () => {
    const mockBookings = Array(10).fill(null).map((_, i) => ({
      _id: `b${i + 20}`,
      customerId: { _id: `c${i + 20}`, fullName: `User${i + 20}` },
      serviceId: { _id: `s${i + 20}`, name: `Service${i + 20}` },
      status: 'PENDING'
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(30);

    const result = await bookingService.getAllBookings(3, 10);

    expect(mockSkip).toHaveBeenCalledWith(20);
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(result.bookings).toHaveLength(10);
    expect(result.total).toBe(30);
    expect(result.totalPages).toBe(3);
  });

  // ========== ERROR SCENARIOS (3 tests) ==========

  test('ERR-1: Database connection fails during find()', async () => {
    const mockExec = jest.fn().mockRejectedValue(new Error('DB connection lost'));
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(10);

    await expect(bookingService.getAllBookings(1, 10)).rejects.toThrow('Failed to get bookings:');
  });

  test('ERR-2: countDocuments() throws error', async () => {
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'c1', fullName: 'Alice' }, serviceId: { _id: 's1', name: 'Service1' }, status: 'PENDING' }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockRejectedValue(new Error('Count query failed'));

    await expect(bookingService.getAllBookings(1, 10)).rejects.toThrow('Failed to get bookings:');
  });

  test('ERR-3: Promise.all rejects when both queries fail', async () => {
    const mockExec = jest.fn().mockRejectedValue(new Error('Database error'));
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockRejectedValue(new Error('Count failed'));

    await expect(bookingService.getAllBookings(1, 10)).rejects.toThrow('Failed to get bookings:');
  });

  // ========== INTEGRATION WITH STATE (1 test) ==========

  test('INT-1: Full flow with realistic data - verify all components work together', async () => {
    const mockBookings = [
      {
        _id: 'booking1',
        customerId: { _id: 'cust1', fullName: 'Alice Johnson' },
        serviceId: { _id: 'svc1', name: 'Bridal Makeup', price: 500 },
        status: 'COMPLETED',
        bookingDate: new Date('2025-01-15T10:00:00'),
        duration: 120,
        totalPrice: 500,
        createdAt: new Date('2025-01-10')
      },
      {
        _id: 'booking2',
        customerId: { _id: 'cust2', fullName: 'Bob Smith' },
        serviceId: { _id: 'svc2', name: 'Hair Styling', price: 300 },
        status: 'COMPLETED',
        bookingDate: new Date('2025-01-16T14:00:00'),
        duration: 90,
        totalPrice: 300,
        createdAt: new Date('2025-01-11')
      }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(15);

    const result = await bookingService.getAllBookings(1, 3, 'COMPLETED');

    // Verify correct filter passed
    expect(mockFind).toHaveBeenCalledWith({ status: 'COMPLETED' });
    expect(mockFind).toHaveBeenCalledTimes(1);

    // Verify query chain
    expect(mockPopulate).toHaveBeenCalledWith('customerId serviceId');
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(3);
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });

    // Verify result structure
    expect(result).toHaveProperty('bookings');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('totalPages');

    // Verify result values
    expect(result.bookings).toHaveLength(2);
    expect(result.total).toBe(15);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(5);

    // Verify data integrity
    expect(result.bookings[0]).toHaveProperty('_id');
    expect(result.bookings[0]).toHaveProperty('customerName');
    expect(result.bookings[0]).toHaveProperty('serviceName');
    expect(result.bookings[0].status).toBe('COMPLETED');
  });
});

// ==================== TEST SUITE: getBookingsByCustomer (Service Layer) ====================
describe('getBookingsByCustomer (Service)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  // ========== HAPPY PATH SCENARIOS (5 tests) ==========

  test('HP-1: Retrieve bookings for customer with default pagination', async () => {
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'cust1', fullName: 'Alice' }, serviceId: { _id: 's1', name: 'Makeup' }, status: 'CONFIRMED', bookingDate: new Date('2025-01-20') },
      { _id: 'b2', customerId: { _id: 'cust1', fullName: 'Alice' }, serviceId: { _id: 's2', name: 'Hair' }, status: 'PENDING', bookingDate: new Date('2025-01-15') },
      { _id: 'b3', customerId: { _id: 'cust1', fullName: 'Alice' }, serviceId: { _id: 's3', name: 'Nails' }, status: 'COMPLETED', bookingDate: new Date('2025-01-10') }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(3);

    const result = await bookingService.getBookingsByCustomer('cust1', 1, 10);

    expect(mockFind).toHaveBeenCalledWith({ customerId: 'cust1' });
    expect(mockPopulate).toHaveBeenCalledWith('customerId serviceId');
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(mockSort).toHaveBeenCalledWith({ bookingDate: -1 });
    expect(result.bookings).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  test('HP-2: Retrieve bookings with custom pagination (page=2, pageSize=5)', async () => {
    const mockBookings = Array(5).fill(null).map((_, i) => ({
      _id: `b${i + 5}`,
      customerId: { _id: 'cust2', fullName: 'Bob' },
      serviceId: { _id: `s${i + 5}`, name: `Service${i + 5}` },
      status: 'CONFIRMED',
      bookingDate: new Date(`2025-01-${15 + i}`)
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(12);

    const result = await bookingService.getBookingsByCustomer('cust2', 2, 5);

    expect(mockFind).toHaveBeenCalledWith({ customerId: 'cust2' });
    expect(mockSkip).toHaveBeenCalledWith(5);
    expect(mockLimit).toHaveBeenCalledWith(5);
    expect(result.bookings).toHaveLength(5);
    expect(result.total).toBe(12);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
  });

  test('HP-3: Customer with many bookings across multiple pages', async () => {
    const mockBookings = Array(10).fill(null).map((_, i) => ({
      _id: `b${i}`,
      customerId: { _id: 'cust3', fullName: 'Charlie' },
      serviceId: { _id: `s${i}`, name: `Service${i}` },
      status: 'COMPLETED',
      bookingDate: new Date(`2025-01-${i + 1}`)
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(47);

    const result = await bookingService.getBookingsByCustomer('cust3', 1, 10);

    expect(result.bookings).toHaveLength(10);
    expect(result.total).toBe(47);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(5);
  });

  test('HP-4: Customer with exactly one page of bookings', async () => {
    const mockBookings = Array(10).fill(null).map((_, i) => ({
      _id: `b${i}`,
      customerId: { _id: 'cust4', fullName: 'Diana' },
      serviceId: { _id: `s${i}`, name: `Service${i}` },
      status: 'PENDING',
      bookingDate: new Date(`2025-01-${i + 1}`)
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(10);

    const result = await bookingService.getBookingsByCustomer('cust4', 1, 10);

    expect(result.bookings).toHaveLength(10);
    expect(result.total).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  test('HP-5: Customer with no bookings (empty result)', async () => {
    const mockBookings: any[] = [];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(0);

    const result = await bookingService.getBookingsByCustomer('cust5', 1, 10);

    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(0);
  });

  // ========== EDGE CASES (3 tests) ==========

  test('EDGE-1: Very long customerId string (boundary input)', async () => {
    const longId = 'a'.repeat(100);
    const mockBookings = [
      { _id: 'b1', customerId: { _id: longId, fullName: 'Test User' }, serviceId: { _id: 's1', name: 'Service' }, status: 'PENDING', bookingDate: new Date() }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(2);

    const result = await bookingService.getBookingsByCustomer(longId, 1, 10);

    expect(mockFind).toHaveBeenCalledWith({ customerId: longId });
    expect(result.bookings).toHaveLength(1);
    expect(result.total).toBe(2);
  });

  test('EDGE-2: Page beyond available data (page=10, but only 1 page exists)', async () => {
    const mockBookings: any[] = [];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(5);

    const result = await bookingService.getBookingsByCustomer('cust6', 10, 10);

    expect(mockSkip).toHaveBeenCalledWith(90);
    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.page).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  test('EDGE-3: Large pageSize (pageSize=500)', async () => {
    const mockBookings = Array(100).fill(null).map((_, i) => ({
      _id: `b${i}`,
      customerId: { _id: 'cust7', fullName: 'User7' },
      serviceId: { _id: `s${i}`, name: `Service${i}` },
      status: 'COMPLETED',
      bookingDate: new Date()
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(100);

    const result = await bookingService.getBookingsByCustomer('cust7', 1, 500);

    expect(mockLimit).toHaveBeenCalledWith(500);
    expect(result.bookings).toHaveLength(100);
    expect(result.total).toBe(100);
    expect(result.totalPages).toBe(1);
  });

  // ========== ERROR SCENARIOS (3 tests) ==========

  test('ERR-1: Database find() query fails', async () => {
    const mockExec = jest.fn().mockRejectedValue(new Error('Database timeout'));
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(10);

    await expect(bookingService.getBookingsByCustomer('cust8', 1, 10))
      .rejects.toThrow('Failed to get customer bookings:');
  });

  test('ERR-2: countDocuments() fails', async () => {
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'cust9', fullName: 'User9' }, serviceId: { _id: 's1', name: 'Service1' }, status: 'PENDING', bookingDate: new Date() }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockRejectedValue(new Error('Count failed'));

    await expect(bookingService.getBookingsByCustomer('cust9', 1, 10))
      .rejects.toThrow('Failed to get customer bookings:');
  });

  test('ERR-3: Empty customerId (invalid input)', async () => {
    const mockBookings: any[] = [];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(0);

    const result = await bookingService.getBookingsByCustomer('', 1, 10);

    expect(mockFind).toHaveBeenCalledWith({ customerId: '' });
    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  // ========== INTEGRATION WITH STATE (1 test) ==========

  test('INT-1: Full flow with realistic customer booking data', async () => {
    const mockBookings = [
      {
        _id: 'b3',
        customerId: { _id: 'real_customer_123', fullName: 'Emma Watson' },
        serviceId: { _id: 's1', name: 'Bridal Makeup', price: 600 },
        status: 'CONFIRMED',
        bookingDate: new Date('2025-01-20T10:00:00'),
        duration: 120,
        totalPrice: 600
      },
      {
        _id: 'b2',
        customerId: { _id: 'real_customer_123', fullName: 'Emma Watson' },
        serviceId: { _id: 's2', name: 'Hair Styling', price: 300 },
        status: 'COMPLETED',
        bookingDate: new Date('2025-01-15T14:00:00'),
        duration: 90,
        totalPrice: 300
      },
      {
        _id: 'b1',
        customerId: { _id: 'real_customer_123', fullName: 'Emma Watson' },
        serviceId: { _id: 's3', name: 'Nail Art', price: 100 },
        status: 'CANCELLED',
        bookingDate: new Date('2025-01-10T11:00:00'),
        duration: 60,
        totalPrice: 100
      }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(8);

    const result = await bookingService.getBookingsByCustomer('real_customer_123', 1, 3);

    // Verify correct filter
    expect(mockFind).toHaveBeenCalledWith({ customerId: 'real_customer_123' });
    expect(mockFind).toHaveBeenCalledTimes(1);

    // Verify query chain
    expect(mockPopulate).toHaveBeenCalledWith('customerId serviceId');
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(3);
    expect(mockSort).toHaveBeenCalledWith({ bookingDate: -1 });

    // Verify result structure
    expect(result).toHaveProperty('bookings');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('totalPages');

    // Verify result values
    expect(result.bookings).toHaveLength(3);
    expect(result.total).toBe(8);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);

    // Verify data integrity and sorting (bookingDate descending)
    expect(result.bookings[0]).toHaveProperty('_id');
    expect(result.bookings[0]).toHaveProperty('customerName');
    expect(result.bookings[0].customerName).toBe('Emma Watson');
    
    // Verify bookings are for the same customer
    result.bookings.forEach(booking => {
      expect(booking.customerName).toBe('Emma Watson');
    });
  });
});

// ==================== TEST SUITE: getBookingsByMUA (Service Layer) ====================
describe('getBookingsByMUA (Service)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  // ========== HAPPY PATH SCENARIOS (5 tests) ==========

  test('HP-1: Retrieve bookings for MUA with default pagination', async () => {
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'c1', fullName: 'Alice' }, serviceId: { _id: 's1', name: 'Makeup' }, muaId: 'mua1', status: 'CONFIRMED', bookingDate: new Date('2025-01-25') },
      { _id: 'b2', customerId: { _id: 'c2', fullName: 'Bob' }, serviceId: { _id: 's2', name: 'Hair' }, muaId: 'mua1', status: 'PENDING', bookingDate: new Date('2025-01-20') },
      { _id: 'b3', customerId: { _id: 'c3', fullName: 'Charlie' }, serviceId: { _id: 's3', name: 'Nails' }, muaId: 'mua1', status: 'COMPLETED', bookingDate: new Date('2025-01-15') },
      { _id: 'b4', customerId: { _id: 'c4', fullName: 'Diana' }, serviceId: { _id: 's4', name: 'Spa' }, muaId: 'mua1', status: 'CANCELLED', bookingDate: new Date('2025-01-10') }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(4);

    const result = await bookingService.getBookingsByMUA('mua1', 1, 10);

    expect(mockFind).toHaveBeenCalledWith({ muaId: 'mua1' });
    expect(mockPopulate).toHaveBeenCalledWith('customerId serviceId');
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(mockSort).toHaveBeenCalledWith({ bookingDate: -1 });
    expect(result.bookings).toHaveLength(4);
    expect(result.total).toBe(4);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  test('HP-2: MUA with custom pagination (page=3, pageSize=8)', async () => {
    const mockBookings = Array(8).fill(null).map((_, i) => ({
      _id: `b${i + 16}`,
      customerId: { _id: `c${i}`, fullName: `Customer${i}` },
      serviceId: { _id: `s${i}`, name: `Service${i}` },
      muaId: 'mua2',
      status: 'CONFIRMED',
      bookingDate: new Date(`2025-01-${i + 1}`)
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(25);

    const result = await bookingService.getBookingsByMUA('mua2', 3, 8);

    expect(mockFind).toHaveBeenCalledWith({ muaId: 'mua2' });
    expect(mockSkip).toHaveBeenCalledWith(16);
    expect(mockLimit).toHaveBeenCalledWith(8);
    expect(result.bookings).toHaveLength(8);
    expect(result.total).toBe(25);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(4);
  });

  test('HP-3: Popular MUA with many bookings (100+ bookings)', async () => {
    const mockBookings = Array(10).fill(null).map((_, i) => ({
      _id: `b${i}`,
      customerId: { _id: `c${i}`, fullName: `Customer${i}` },
      serviceId: { _id: `s${i}`, name: `Service${i}` },
      muaId: 'mua3',
      status: 'COMPLETED',
      bookingDate: new Date(`2025-01-${i + 1}`)
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(127);

    const result = await bookingService.getBookingsByMUA('mua3', 1, 10);

    expect(result.bookings).toHaveLength(10);
    expect(result.total).toBe(127);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(13);
  });

  test('HP-4: New MUA with few bookings', async () => {
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'c1', fullName: 'FirstCustomer' }, serviceId: { _id: 's1', name: 'Service1' }, muaId: 'mua4', status: 'CONFIRMED', bookingDate: new Date('2025-01-25') },
      { _id: 'b2', customerId: { _id: 'c2', fullName: 'SecondCustomer' }, serviceId: { _id: 's2', name: 'Service2' }, muaId: 'mua4', status: 'PENDING', bookingDate: new Date('2025-01-20') }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(2);

    const result = await bookingService.getBookingsByMUA('mua4', 1, 10);

    expect(result.bookings).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
  });

  test('HP-5: MUA with no bookings yet (empty result)', async () => {
    const mockBookings: any[] = [];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(0);

    const result = await bookingService.getBookingsByMUA('mua5', 1, 10);

    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(0);
  });

  // ========== EDGE CASES (3 tests) ==========

  test('EDGE-1: MongoDB ObjectId format (24-char hex string)', async () => {
    const objectId = '507f1f77bcf86cd799439011';
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'c1', fullName: 'Alice' }, serviceId: { _id: 's1', name: 'Service' }, muaId: objectId, status: 'CONFIRMED', bookingDate: new Date() },
      { _id: 'b2', customerId: { _id: 'c2', fullName: 'Bob' }, serviceId: { _id: 's2', name: 'Service' }, muaId: objectId, status: 'PENDING', bookingDate: new Date() },
      { _id: 'b3', customerId: { _id: 'c3', fullName: 'Charlie' }, serviceId: { _id: 's3', name: 'Service' }, muaId: objectId, status: 'COMPLETED', bookingDate: new Date() }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(3);

    const result = await bookingService.getBookingsByMUA(objectId, 1, 10);

    expect(mockFind).toHaveBeenCalledWith({ muaId: objectId });
    expect(result.bookings).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  test('EDGE-2: Requesting last page with partial results', async () => {
    const mockBookings = [
      { _id: 'b21', customerId: { _id: 'c21', fullName: 'User21' }, serviceId: { _id: 's21', name: 'Service21' }, muaId: 'mua6', status: 'PENDING', bookingDate: new Date() },
      { _id: 'b22', customerId: { _id: 'c22', fullName: 'User22' }, serviceId: { _id: 's22', name: 'Service22' }, muaId: 'mua6', status: 'CONFIRMED', bookingDate: new Date() },
      { _id: 'b23', customerId: { _id: 'c23', fullName: 'User23' }, serviceId: { _id: 's23', name: 'Service23' }, muaId: 'mua6', status: 'COMPLETED', bookingDate: new Date() }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(23);

    const result = await bookingService.getBookingsByMUA('mua6', 3, 10);

    expect(mockSkip).toHaveBeenCalledWith(20);
    expect(result.bookings).toHaveLength(3);
    expect(result.total).toBe(23);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
  });

  test('EDGE-3: Large pageSize for MUA dashboard (pageSize=100)', async () => {
    const mockBookings = Array(100).fill(null).map((_, i) => ({
      _id: `b${i}`,
      customerId: { _id: `c${i}`, fullName: `Customer${i}` },
      serviceId: { _id: `s${i}`, name: `Service${i}` },
      muaId: 'mua7',
      status: 'CONFIRMED',
      bookingDate: new Date()
    }));

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(150);

    const result = await bookingService.getBookingsByMUA('mua7', 1, 100);

    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(result.bookings).toHaveLength(100);
    expect(result.total).toBe(150);
    expect(result.totalPages).toBe(2);
  });

  // ========== ERROR SCENARIOS (3 tests) ==========

  test('ERR-1: Database connection fails during query', async () => {
    const mockExec = jest.fn().mockRejectedValue(new Error('Connection refused'));
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(10);

    await expect(bookingService.getBookingsByMUA('mua8', 1, 10))
      .rejects.toThrow('Failed to get MUA bookings:');
  });

  test('ERR-2: countDocuments() timeout', async () => {
    const mockBookings = [
      { _id: 'b1', customerId: { _id: 'c1', fullName: 'User' }, serviceId: { _id: 's1', name: 'Service' }, muaId: 'mua9', status: 'PENDING', bookingDate: new Date() }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockRejectedValue(new Error('Query timeout'));

    await expect(bookingService.getBookingsByMUA('mua9', 1, 10))
      .rejects.toThrow('Failed to get MUA bookings:');
  });

  test('ERR-3: Invalid muaId format (empty string)', async () => {
    const mockBookings: any[] = [];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(0);

    const result = await bookingService.getBookingsByMUA('', 1, 10);

    expect(mockFind).toHaveBeenCalledWith({ muaId: '' });
    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  // ========== INTEGRATION WITH STATE (1 test) ==========

  test('INT-1: Full MUA booking management scenario', async () => {
    const mockBookings = [
      {
        _id: 'b4',
        customerId: { _id: 'c1', fullName: 'Alice Johnson' },
        serviceId: { _id: 's1', name: 'Bridal Makeup', price: 600 },
        muaId: 'mua_artist_456',
        status: 'CONFIRMED',
        bookingDate: new Date('2025-02-01T10:00:00'),
        duration: 120,
        totalPrice: 600
      },
      {
        _id: 'b3',
        customerId: { _id: 'c2', fullName: 'Bob Smith' },
        serviceId: { _id: 's2', name: 'Hair Styling', price: 300 },
        muaId: 'mua_artist_456',
        status: 'PENDING',
        bookingDate: new Date('2025-01-25T14:00:00'),
        duration: 90,
        totalPrice: 300
      },
      {
        _id: 'b2',
        customerId: { _id: 'c3', fullName: 'Charlie Brown' },
        serviceId: { _id: 's3', name: 'Evening Makeup', price: 400 },
        muaId: 'mua_artist_456',
        status: 'COMPLETED',
        bookingDate: new Date('2025-01-20T16:00:00'),
        duration: 60,
        totalPrice: 400
      },
      {
        _id: 'b1',
        customerId: { _id: 'c4', fullName: 'Diana Prince' },
        serviceId: { _id: 's4', name: 'Party Makeup', price: 200 },
        muaId: 'mua_artist_456',
        status: 'CANCELLED',
        bookingDate: new Date('2025-01-10T11:00:00'),
        duration: 45,
        totalPrice: 200
      }
    ];

    const mockExec = jest.fn().mockResolvedValue(mockBookings);
    const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
    const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

    jest.spyOn(Booking, 'find').mockImplementation(mockFind);
    jest.spyOn(Booking, 'countDocuments').mockResolvedValue(18);

    const result = await bookingService.getBookingsByMUA('mua_artist_456', 1, 5);

    // Verify correct filter
    expect(mockFind).toHaveBeenCalledWith({ muaId: 'mua_artist_456' });
    expect(mockFind).toHaveBeenCalledTimes(1);

    // Verify query chain
    expect(mockPopulate).toHaveBeenCalledWith('customerId serviceId');
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockLimit).toHaveBeenCalledWith(5);
    expect(mockSort).toHaveBeenCalledWith({ bookingDate: -1 });

    // Verify result structure
    expect(result).toHaveProperty('bookings');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('totalPages');

    // Verify result values
    expect(result.bookings).toHaveLength(4);
    expect(result.total).toBe(18);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(4);

    // Verify data integrity
    expect(result.bookings[0]).toHaveProperty('_id');
    expect(result.bookings[0]).toHaveProperty('customerName');
    expect(result.bookings[0]).toHaveProperty('serviceName');

    // Verify different customers and statuses
    const customerNames = result.bookings.map(b => b.customerName);
    expect(customerNames).toContain('Alice Johnson');
    expect(customerNames).toContain('Bob Smith');
    
    const statuses = result.bookings.map(b => b.status);
    expect(statuses).toContain('CONFIRMED');
    expect(statuses).toContain('PENDING');
    expect(statuses).toContain('COMPLETED');
    expect(statuses).toContain('CANCELLED');
  });
});


