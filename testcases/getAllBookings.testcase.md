# getAllBookings() — Test cases

This file documents unit test cases for:

```ts
export async function getAllBookings(
    page: number = 1, 
    pageSize: number = 10,
    status?: string
): Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }>
```

Behavior summary (from implementation):
- Calculates `skip = (page - 1) * pageSize`
- Builds filter object, optionally including `status` if provided
- Executes `Promise.all([Booking.find(filter).populate('customerId serviceId').skip(skip).limit(pageSize).sort({ createdAt: -1 }).exec(), Booking.countDocuments(filter)])`
- Maps bookings through `formatBookingResponse()`
- Returns object with `{ bookings, total, page, totalPages: Math.ceil(total / pageSize) }`
- On unexpected errors throws `Error('Failed to get bookings: ...')`

----

Test structure for each case:
- Title — short test name
- Purpose — what to verify
- Mocks / preconditions — how to stub `Booking.find`, `Booking.countDocuments`, and `formatBookingResponse`
- Input — page, pageSize, status
- Expected output / assertions
- Steps — arrange / act / assert

----

## Happy path scenarios (5 tests)

### HP-1: Default pagination (page=1, pageSize=10, no status filter)
- **Purpose**: Verify normal retrieval with default parameters
- **Mocks**: 
  - `Booking.find({})` returns chain → `.exec()` resolves to array of 5 bookings
  - `Booking.countDocuments({})` resolves to 5
  - `formatBookingResponse` maps each booking to DTO
- **Input**: `page=1, pageSize=10, status=undefined`
- **Expected**: 
  - `skip(0)`, `limit(10)` called
  - Returns `{ bookings: [5 DTOs], total: 5, page: 1, totalPages: 1 }`
  - Bookings sorted by `createdAt: -1`

### HP-2: Custom pagination (page=2, pageSize=5)
- **Purpose**: Verify pagination calculation with custom values
- **Mocks**: 
  - `Booking.find({})` → 5 bookings (representing page 2)
  - `Booking.countDocuments({})` → 15 total
- **Input**: `page=2, pageSize=5, status=undefined`
- **Expected**: 
  - `skip(5)` called (skips first 5)
  - Returns `{ bookings: [5 DTOs], total: 15, page: 2, totalPages: 3 }`

### HP-3: Filter by status (status='CONFIRMED')
- **Purpose**: Verify status filtering works correctly
- **Mocks**: 
  - `Booking.find({ status: 'CONFIRMED' })` → 3 confirmed bookings
  - `Booking.countDocuments({ status: 'CONFIRMED' })` → 3
- **Input**: `page=1, pageSize=10, status='CONFIRMED'`
- **Expected**: 
  - Filter includes `{ status: 'CONFIRMED' }`
  - Returns `{ bookings: [3 DTOs], total: 3, page: 1, totalPages: 1 }`

### HP-4: Combined filters (page=3, pageSize=20, status='PENDING')
- **Purpose**: Verify all parameters work together
- **Mocks**: 
  - `Booking.find({ status: 'PENDING' })` → empty array
  - `Booking.countDocuments({ status: 'PENDING' })` → 45 total
- **Input**: `page=3, pageSize=20, status='PENDING'`
- **Expected**: 
  - `skip(40)`, `limit(20)` called
  - Returns `{ bookings: [], total: 45, page: 3, totalPages: 3 }`

### HP-5: Empty result set (no bookings in database)
- **Purpose**: Verify graceful handling of empty database
- **Mocks**: 
  - `Booking.find({})` → empty array
  - `Booking.countDocuments({})` → 0
- **Input**: `page=1, pageSize=10, status=undefined`
- **Expected**: 
  - Returns `{ bookings: [], total: 0, page: 1, totalPages: 0 }`
  - No errors thrown

----

## Edge cases (boundary values) (3 tests)

### EDGE-1: Page=0 (boundary value)
- **Purpose**: Test behavior with zero page number
- **Mocks**: 
  - `Booking.find({})` → 10 bookings
  - `Booking.countDocuments({})` → 10
- **Input**: `page=0, pageSize=10, status=undefined`
- **Expected**: 
  - `skip(-10)` calculated (page 0 - 1) * 10
  - Function executes (MongoDB may handle negative skip)
  - Returns result with `page: 0`

### EDGE-2: Very large pageSize (pageSize=1000)
- **Purpose**: Test handling of large page sizes
- **Mocks**: 
  - `Booking.find({})` → array of 1000 bookings
  - `Booking.countDocuments({})` → 1000
- **Input**: `page=1, pageSize=1000, status=undefined`
- **Expected**: 
  - `limit(1000)` called
  - Returns `{ bookings: [1000 DTOs], total: 1000, page: 1, totalPages: 1 }`
  - Performance may be slow but should complete

### EDGE-3: Exact page boundary (total=30, pageSize=10, page=3)
- **Purpose**: Test totalPages calculation at exact boundary
- **Mocks**: 
  - `Booking.find({})` → 10 bookings
  - `Booking.countDocuments({})` → 30
- **Input**: `page=3, pageSize=10, status=undefined`
- **Expected**: 
  - `skip(20)`, `limit(10)` called
  - Returns `{ bookings: [10 DTOs], total: 30, page: 3, totalPages: 3 }`
  - `Math.ceil(30/10) = 3`

----

## Error scenarios (3 tests)

### ERR-1: Database connection fails during find()
- **Purpose**: Verify error handling when database query fails
- **Mocks**: 
  - `Booking.find().populate().skip().limit().sort().exec()` → rejects with `Error('DB connection lost')`
- **Input**: `page=1, pageSize=10, status=undefined`
- **Expected**: 
  - Function throws `Error('Failed to get bookings: Error: DB connection lost')`
  - Error message includes original error

### ERR-2: countDocuments() throws error
- **Purpose**: Verify error handling when count query fails
- **Mocks**: 
  - `Booking.find()...exec()` → resolves successfully
  - `Booking.countDocuments()` → rejects with `Error('Count query failed')`
- **Input**: `page=1, pageSize=10, status=undefined`
- **Expected**: 
  - `Promise.all` rejects
  - Function throws `Error('Failed to get bookings: ...')`

### ERR-3: formatBookingResponse throws error
- **Purpose**: Verify error handling during response formatting
- **Mocks**: 
  - `Booking.find()...exec()` → resolves to [booking1, booking2]
  - `Booking.countDocuments()` → resolves to 2
  - `formatBookingResponse` → throws `Error('Invalid booking data')` on first call
- **Input**: `page=1, pageSize=10, status=undefined`
- **Expected**: 
  - Function throws during `.map()` operation
  - Error propagates: `Error('Failed to get bookings: ...')`

----

## Integration with state (1 test)

### INT-1: Full flow with realistic data - verify all components work together
- **Purpose**: Simulate production scenario with complete data flow
- **Mocks**: 
  - `Booking.find({ status: 'COMPLETED' })` returns array of 2 populated bookings with:
    - `_id`, `customerId: { _id, fullName }`, `serviceId: { _id, name, price }`, `status: 'COMPLETED'`, `bookingDate`, `duration`, `totalPrice`, etc.
  - `Booking.countDocuments({ status: 'COMPLETED' })` → 15
  - `formatBookingResponse` properly transforms each booking
- **Input**: `page=1, pageSize=3, status='COMPLETED'`
- **Expected**: 
  - Verify `Booking.find` called with correct filter `{ status: 'COMPLETED' }`
  - Verify `populate('customerId serviceId')` called
  - Verify `skip(0)` and `limit(3)` called
  - Verify `sort({ createdAt: -1 })` called
  - Returns structured response:
    ```ts
    {
      bookings: [
        { _id: 'b1', customerName: 'Alice', serviceName: 'Makeup', status: 'COMPLETED', ... },
        { _id: 'b2', customerName: 'Bob', serviceName: 'Hair Styling', status: 'COMPLETED', ... }
      ],
      total: 15,
      page: 1,
      totalPages: 5
    }
    ```
  - Verify `formatBookingResponse` called 2 times
  - Verify data integrity maintained through entire flow

----

## Notes for test authors

**Mocking Booking.find chain:**
```ts
const mockExec = jest.fn().mockResolvedValue([booking1, booking2]);
const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

jest.spyOn(Booking, 'find').mockImplementation(mockFind);
```

**Mocking countDocuments:**
```ts
jest.spyOn(Booking, 'countDocuments').mockResolvedValue(15);
```

**Mocking formatBookingResponse:**
```ts
jest.spyOn(bookingService, 'formatBookingResponse').mockImplementation((booking) => ({
  _id: booking._id.toString(),
  customerName: booking.customerId?.fullName || '',
  // ... other fields
}));
```

**Error testing:**
```ts
await expect(getAllBookings(1, 10)).rejects.toThrow('Failed to get bookings:');
```

**Cleanup:**
```ts
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
```

----

## Implementation checklist

- [ ] HP-1: Default pagination test
- [ ] HP-2: Custom pagination test
- [ ] HP-3: Status filter test
- [ ] HP-4: Combined filters test
- [ ] HP-5: Empty result test
- [ ] EDGE-1: Page=0 test
- [ ] EDGE-2: Large pageSize test
- [ ] EDGE-3: Exact boundary test
- [ ] ERR-1: Database find error test
- [ ] ERR-2: Count error test
- [ ] ERR-3: Format error test
- [ ] INT-1: Full integration test

Total: 12 test cases
