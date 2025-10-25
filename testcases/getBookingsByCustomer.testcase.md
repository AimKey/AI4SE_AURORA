# getBookingsByCustomer() — Test cases

This file documents unit test cases for:

```ts
export async function getBookingsByCustomer(
    customerId: string,
    page: number = 1,
    pageSize: number = 10
): Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }>
```

Behavior summary (from implementation):
- Calculates `skip = (page - 1) * pageSize`
- Builds filter with `{ customerId }`
- Executes `Promise.all([Booking.find({ customerId }).populate('customerId serviceId').skip(skip).limit(pageSize).sort({ bookingDate: -1 }).exec(), Booking.countDocuments({ customerId })])`
- Maps bookings through `formatBookingResponse()`
- Returns object with `{ bookings, total, page, totalPages: Math.ceil(total / pageSize) }`
- Sorts by `bookingDate: -1` (most recent first)
- On unexpected errors throws `Error('Failed to get customer bookings: ...')`

----

## Happy path scenarios (5 tests)

### HP-1: Retrieve bookings for customer with default pagination
- **Purpose**: Verify normal retrieval for a specific customer
- **Mocks**: 
  - `Booking.find({ customerId: 'cust1' })` → 3 bookings
  - `Booking.countDocuments({ customerId: 'cust1' })` → 3
- **Input**: `customerId='cust1', page=1, pageSize=10`
- **Expected**: 
  - Filter includes `{ customerId: 'cust1' }`
  - Returns `{ bookings: [3 DTOs], total: 3, page: 1, totalPages: 1 }`
  - Sorted by `bookingDate: -1`

### HP-2: Retrieve bookings with custom pagination (page=2, pageSize=5)
- **Purpose**: Verify pagination works correctly for customer bookings
- **Mocks**: 
  - `Booking.find({ customerId: 'cust2' })` → 5 bookings
  - `Booking.countDocuments({ customerId: 'cust2' })` → 12
- **Input**: `customerId='cust2', page=2, pageSize=5`
- **Expected**: 
  - `skip(5)` called
  - Returns `{ bookings: [5 DTOs], total: 12, page: 2, totalPages: 3 }`

### HP-3: Customer with many bookings across multiple pages
- **Purpose**: Verify correct totalPages calculation
- **Mocks**: 
  - `Booking.find({ customerId: 'cust3' })` → 10 bookings
  - `Booking.countDocuments({ customerId: 'cust3' })` → 47
- **Input**: `customerId='cust3', page=1, pageSize=10`
- **Expected**: 
  - Returns `{ bookings: [10 DTOs], total: 47, page: 1, totalPages: 5 }`

### HP-4: Customer with exactly one page of bookings
- **Purpose**: Verify edge of pagination (total equals pageSize)
- **Mocks**: 
  - `Booking.find({ customerId: 'cust4' })` → 10 bookings
  - `Booking.countDocuments({ customerId: 'cust4' })` → 10
- **Input**: `customerId='cust4', page=1, pageSize=10`
- **Expected**: 
  - Returns `{ bookings: [10 DTOs], total: 10, page: 1, totalPages: 1 }`

### HP-5: Customer with no bookings (empty result)
- **Purpose**: Verify graceful handling when customer has no bookings
- **Mocks**: 
  - `Booking.find({ customerId: 'cust5' })` → empty array
  - `Booking.countDocuments({ customerId: 'cust5' })` → 0
- **Input**: `customerId='cust5', page=1, pageSize=10`
- **Expected**: 
  - Returns `{ bookings: [], total: 0, page: 1, totalPages: 0 }`
  - No errors thrown

----

## Edge cases (3 tests)

### EDGE-1: Very long customerId string (boundary input)
- **Purpose**: Ensure function handles long ID strings
- **Mocks**: 
  - `Booking.find({ customerId: 'very_long_id...' })` → 2 bookings
  - `Booking.countDocuments({ customerId: 'very_long_id...' })` → 2
- **Input**: `customerId='a'.repeat(100), page=1, pageSize=10`
- **Expected**: 
  - Function executes without error
  - Returns valid result structure

### EDGE-2: Page beyond available data (page=10, but only 1 page exists)
- **Purpose**: Test behavior when requesting page beyond available data
- **Mocks**: 
  - `Booking.find({ customerId: 'cust6' })` → empty array
  - `Booking.countDocuments({ customerId: 'cust6' })` → 5
- **Input**: `customerId='cust6', page=10, pageSize=10`
- **Expected**: 
  - `skip(90)` called
  - Returns `{ bookings: [], total: 5, page: 10, totalPages: 1 }`

### EDGE-3: Large pageSize (pageSize=500)
- **Purpose**: Test handling of unusually large page sizes
- **Mocks**: 
  - `Booking.find({ customerId: 'cust7' })` → 100 bookings
  - `Booking.countDocuments({ customerId: 'cust7' })` → 100
- **Input**: `customerId='cust7', page=1, pageSize=500`
- **Expected**: 
  - `limit(500)` called
  - Returns `{ bookings: [100 DTOs], total: 100, page: 1, totalPages: 1 }`

----

## Error scenarios (3 tests)

### ERR-1: Database find() query fails
- **Purpose**: Verify error handling when query fails
- **Mocks**: 
  - `Booking.find({ customerId: 'cust8' }).exec()` → rejects with `Error('Database timeout')`
- **Input**: `customerId='cust8', page=1, pageSize=10`
- **Expected**: 
  - Function throws `Error('Failed to get customer bookings: Error: Database timeout')`

### ERR-2: countDocuments() fails
- **Purpose**: Verify error handling when count fails
- **Mocks**: 
  - `Booking.find({ customerId: 'cust9' }).exec()` → resolves successfully
  - `Booking.countDocuments({ customerId: 'cust9' })` → rejects with `Error('Count failed')`
- **Input**: `customerId='cust9', page=1, pageSize=10`
- **Expected**: 
  - `Promise.all` rejects
  - Function throws `Error('Failed to get customer bookings: ...')`

### ERR-3: Empty customerId (invalid input)
- **Purpose**: Test behavior with empty string customerId
- **Mocks**: 
  - `Booking.find({ customerId: '' })` → empty array
  - `Booking.countDocuments({ customerId: '' })` → 0
- **Input**: `customerId='', page=1, pageSize=10`
- **Expected**: 
  - Function executes (MongoDB may return no results)
  - Returns `{ bookings: [], total: 0, page: 1, totalPages: 0 }`

----

## Integration with state (1 test)

### INT-1: Full flow with realistic customer booking data
- **Purpose**: Simulate production scenario with complete customer booking history
- **Mocks**: 
  - `Booking.find({ customerId: 'real_customer_123' })` returns 3 bookings:
    - Recent booking (2025-01-20) - CONFIRMED
    - Mid booking (2025-01-15) - COMPLETED
    - Old booking (2025-01-10) - CANCELLED
  - `Booking.countDocuments({ customerId: 'real_customer_123' })` → 8
- **Input**: `customerId='real_customer_123', page=1, pageSize=3`
- **Expected**: 
  - Verify `Booking.find` called with `{ customerId: 'real_customer_123' }`
  - Verify `populate('customerId serviceId')` called
  - Verify `sort({ bookingDate: -1 })` - most recent first
  - Returns:
    ```ts
    {
      bookings: [
        { bookingDate: '2025-01-20', status: 'CONFIRMED', ... },
        { bookingDate: '2025-01-15', status: 'COMPLETED', ... },
        { bookingDate: '2025-01-10', status: 'CANCELLED', ... }
      ],
      total: 8,
      page: 1,
      totalPages: 3
    }
    ```
  - Verify bookings are sorted by date (newest first)
  - Verify all bookings belong to same customer

----

## Notes for test authors

**Key differences from getAllBookings:**
- Filter always includes specific `customerId`
- Sorted by `bookingDate: -1` (not `createdAt`)
- Error message: "Failed to get customer bookings"

**Mocking pattern:**
```ts
const mockExec = jest.fn().mockResolvedValue([booking1, booking2]);
const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

jest.spyOn(Booking, 'find').mockImplementation(mockFind);
jest.spyOn(Booking, 'countDocuments').mockResolvedValue(8);
```

**Assertions to verify:**
- Filter includes correct customerId
- Sort by `bookingDate: -1` (not createdAt)
- All returned bookings match the customerId

----

## Implementation checklist

- [ ] HP-1: Default pagination for customer
- [ ] HP-2: Custom pagination
- [ ] HP-3: Many bookings across pages
- [ ] HP-4: Exactly one page
- [ ] HP-5: No bookings (empty)
- [ ] EDGE-1: Very long customerId
- [ ] EDGE-2: Page beyond data
- [ ] EDGE-3: Large pageSize
- [ ] ERR-1: Find query fails
- [ ] ERR-2: Count fails
- [ ] ERR-3: Empty customerId
- [ ] INT-1: Full realistic flow

Total: 12 test cases
