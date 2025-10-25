# getBookingsByMUA() — Test cases

This file documents unit test cases for:

```ts
export async function getBookingsByMUA(
    muaId: string,
    page: number = 1,
    pageSize: number = 10
): Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }>
```

Behavior summary (from implementation):
- Calculates `skip = (page - 1) * pageSize`
- Builds filter with `{ muaId }`
- Executes `Promise.all([Booking.find({ muaId }).populate('customerId serviceId').skip(skip).limit(pageSize).sort({ bookingDate: -1 }).exec(), Booking.countDocuments({ muaId })])`
- Maps bookings through `formatBookingResponse()`
- Returns object with `{ bookings, total, page, totalPages: Math.ceil(total / pageSize) }`
- Sorts by `bookingDate: -1` (most recent first)
- On unexpected errors throws `Error('Failed to get MUA bookings: ...')`

----

## Happy path scenarios (5 tests)

### HP-1: Retrieve bookings for MUA with default pagination
- **Purpose**: Verify normal retrieval for a specific MUA
- **Mocks**: 
  - `Booking.find({ muaId: 'mua1' })` → 4 bookings
  - `Booking.countDocuments({ muaId: 'mua1' })` → 4
- **Input**: `muaId='mua1', page=1, pageSize=10`
- **Expected**: 
  - Filter includes `{ muaId: 'mua1' }`
  - Returns `{ bookings: [4 DTOs], total: 4, page: 1, totalPages: 1 }`
  - Sorted by `bookingDate: -1`

### HP-2: MUA with custom pagination (page=3, pageSize=8)
- **Purpose**: Verify pagination works correctly for MUA bookings
- **Mocks**: 
  - `Booking.find({ muaId: 'mua2' })` → 8 bookings
  - `Booking.countDocuments({ muaId: 'mua2' })` → 25
- **Input**: `muaId='mua2', page=3, pageSize=8`
- **Expected**: 
  - `skip(16)` called
  - Returns `{ bookings: [8 DTOs], total: 25, page: 3, totalPages: 4 }`

### HP-3: Popular MUA with many bookings (100+ bookings)
- **Purpose**: Verify handling of MUA with high booking volume
- **Mocks**: 
  - `Booking.find({ muaId: 'mua3' })` → 10 bookings
  - `Booking.countDocuments({ muaId: 'mua3' })` → 127
- **Input**: `muaId='mua3', page=1, pageSize=10`
- **Expected**: 
  - Returns `{ bookings: [10 DTOs], total: 127, page: 1, totalPages: 13 }`

### HP-4: New MUA with few bookings
- **Purpose**: Verify handling of MUA with minimal booking history
- **Mocks**: 
  - `Booking.find({ muaId: 'mua4' })` → 2 bookings
  - `Booking.countDocuments({ muaId: 'mua4' })` → 2
- **Input**: `muaId='mua4', page=1, pageSize=10`
- **Expected**: 
  - Returns `{ bookings: [2 DTOs], total: 2, page: 1, totalPages: 1 }`

### HP-5: MUA with no bookings yet (empty result)
- **Purpose**: Verify graceful handling when MUA has no bookings
- **Mocks**: 
  - `Booking.find({ muaId: 'mua5' })` → empty array
  - `Booking.countDocuments({ muaId: 'mua5' })` → 0
- **Input**: `muaId='mua5', page=1, pageSize=10`
- **Expected**: 
  - Returns `{ bookings: [], total: 0, page: 1, totalPages: 0 }`
  - No errors thrown

----

## Edge cases (3 tests)

### EDGE-1: MongoDB ObjectId format (24-char hex string)
- **Purpose**: Ensure function handles standard MongoDB ObjectId
- **Mocks**: 
  - `Booking.find({ muaId: '507f1f77bcf86cd799439011' })` → 3 bookings
  - `Booking.countDocuments({ muaId: '507f1f77bcf86cd799439011' })` → 3
- **Input**: `muaId='507f1f77bcf86cd799439011', page=1, pageSize=10`
- **Expected**: 
  - Function executes successfully
  - Returns valid result with 3 bookings

### EDGE-2: Requesting last page with partial results
- **Purpose**: Test when last page has fewer items than pageSize
- **Mocks**: 
  - `Booking.find({ muaId: 'mua6' })` → 3 bookings
  - `Booking.countDocuments({ muaId: 'mua6' })` → 23
- **Input**: `muaId='mua6', page=3, pageSize=10`
- **Expected**: 
  - `skip(20)` called
  - Returns `{ bookings: [3 DTOs], total: 23, page: 3, totalPages: 3 }`

### EDGE-3: Large pageSize for MUA dashboard (pageSize=100)
- **Purpose**: Test MUA viewing many bookings at once
- **Mocks**: 
  - `Booking.find({ muaId: 'mua7' })` → 100 bookings
  - `Booking.countDocuments({ muaId: 'mua7' })` → 150
- **Input**: `muaId='mua7', page=1, pageSize=100`
- **Expected**: 
  - `limit(100)` called
  - Returns `{ bookings: [100 DTOs], total: 150, page: 1, totalPages: 2 }`

----

## Error scenarios (3 tests)

### ERR-1: Database connection fails during query
- **Purpose**: Verify error handling when database is unavailable
- **Mocks**: 
  - `Booking.find({ muaId: 'mua8' }).exec()` → rejects with `Error('Connection refused')`
- **Input**: `muaId='mua8', page=1, pageSize=10`
- **Expected**: 
  - Function throws `Error('Failed to get MUA bookings: Error: Connection refused')`

### ERR-2: countDocuments() timeout
- **Purpose**: Verify error handling when count query times out
- **Mocks**: 
  - `Booking.find({ muaId: 'mua9' }).exec()` → resolves successfully
  - `Booking.countDocuments({ muaId: 'mua9' })` → rejects with `Error('Query timeout')`
- **Input**: `muaId='mua9', page=1, pageSize=10`
- **Expected**: 
  - `Promise.all` rejects
  - Function throws `Error('Failed to get MUA bookings: ...')`

### ERR-3: Invalid muaId format (empty string)
- **Purpose**: Test behavior with invalid muaId input
- **Mocks**: 
  - `Booking.find({ muaId: '' })` → empty array
  - `Booking.countDocuments({ muaId: '' })` → 0
- **Input**: `muaId='', page=1, pageSize=10`
- **Expected**: 
  - Function executes (MongoDB returns no results)
  - Returns `{ bookings: [], total: 0, page: 1, totalPages: 0 }`

----

## Integration with state (1 test)

### INT-1: Full MUA booking management scenario
- **Purpose**: Simulate real MUA viewing their booking schedule
- **Mocks**: 
  - `Booking.find({ muaId: 'mua_artist_456' })` returns 4 bookings:
    - Upcoming (2025-02-01) - CONFIRMED
    - Today (2025-01-25) - PENDING
    - Recent past (2025-01-20) - COMPLETED
    - Old (2025-01-10) - CANCELLED
  - `Booking.countDocuments({ muaId: 'mua_artist_456' })` → 18
- **Input**: `muaId='mua_artist_456', page=1, pageSize=5`
- **Expected**: 
  - Verify `Booking.find` called with `{ muaId: 'mua_artist_456' }`
  - Verify `populate('customerId serviceId')` called
  - Verify `sort({ bookingDate: -1 })` - most recent bookings first
  - Returns:
    ```ts
    {
      bookings: [
        { bookingDate: '2025-02-01', status: 'CONFIRMED', customerName: 'Alice', ... },
        { bookingDate: '2025-01-25', status: 'PENDING', customerName: 'Bob', ... },
        { bookingDate: '2025-01-20', status: 'COMPLETED', customerName: 'Charlie', ... },
        { bookingDate: '2025-01-10', status: 'CANCELLED', customerName: 'Diana', ... }
      ],
      total: 18,
      page: 1,
      totalPages: 4
    }
    ```
  - Verify bookings are sorted by date (newest first)
  - Verify all bookings belong to same MUA
  - Verify different statuses and customers represented

----

## Notes for test authors

**Key characteristics:**
- Filter always includes specific `muaId`
- Sorted by `bookingDate: -1` (same as getBookingsByCustomer)
- Error message: "Failed to get MUA bookings"
- Use case: MUA viewing their own bookings (calendar/schedule view)

**Mocking pattern (same as previous functions):**
```ts
const mockExec = jest.fn().mockResolvedValue([booking1, booking2]);
const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
const mockPopulate = jest.fn().mockReturnValue({ skip: mockSkip });
const mockFind = jest.fn().mockReturnValue({ populate: mockPopulate });

jest.spyOn(Booking, 'find').mockImplementation(mockFind);
jest.spyOn(Booking, 'countDocuments').mockResolvedValue(18);
```

**Assertions to verify:**
- Filter includes correct muaId
- Sort by `bookingDate: -1` (not createdAt)
- All returned bookings match the muaId
- Proper error message format

----

## Implementation checklist

- [ ] HP-1: Default pagination for MUA
- [ ] HP-2: Custom pagination
- [ ] HP-3: Popular MUA (100+ bookings)
- [ ] HP-4: New MUA (few bookings)
- [ ] HP-5: No bookings (empty)
- [ ] EDGE-1: MongoDB ObjectId format
- [ ] EDGE-2: Last page partial results
- [ ] EDGE-3: Large pageSize (dashboard view)
- [ ] ERR-1: Database connection fails
- [ ] ERR-2: Count timeout
- [ ] ERR-3: Invalid/empty muaId
- [ ] INT-1: Full booking management scenario

Total: 12 test cases
