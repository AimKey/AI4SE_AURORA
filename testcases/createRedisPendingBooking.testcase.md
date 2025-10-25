# createRedisPendingBooking() — Test cases

This file documents unit test cases for:

```ts
export async function createRedisPendingBooking(
    bookingData: CreateBookingDTO
): Promise<null | PendingBookingResponseDTO>
```

Behavior summary (from implementation):
- Checks for booking conflicts using `checkBookingConflict(muaId, bookingDate, duration)`
- If conflict exists, throws `Error('Booking conflict detected...')`
- Creates new Booking instance with `status: BOOKING_STATUS.PENDING`
- Generates unique `orderCode` using `generateOrderCode()`
- Formats booking using `formatBookingResponse()`
- Creates `PendingBookingResponseDTO` with formatted data + `customerPhone` + `orderCode`
- Stores in Redis with key `booking:pending:${orderCode}` with 1800s (30min) expiry
- Returns `PendingBookingResponseDTO`
- On unexpected errors throws `Error('Failed to create booking: ...')`

----

## Happy path scenarios (5 tests)

### HP-1: Successfully create pending booking with valid data
- **Purpose**: Verify normal pending booking creation flow
- **Mocks**: 
  - `checkBookingConflict` → `{ hasConflict: false }`
  - `generateOrderCode` → `12345678`
  - `redisClient.json.set` → resolves successfully
  - `redisClient.expire` → resolves successfully
- **Input**: Valid `CreateBookingDTO` with all required fields
- **Expected**: 
  - Returns `PendingBookingResponseDTO` with `orderCode: 12345678`
  - Redis key set to `booking:pending:12345678`
  - Expiry set to 1800 seconds
  - Response includes `customerPhone` field

### HP-2: Create pending booking with minimum required fields
- **Purpose**: Verify function handles minimal data
- **Mocks**: 
  - `checkBookingConflict` → `{ hasConflict: false }`
  - `generateOrderCode` → `87654321`
  - Redis mocks → resolve successfully
- **Input**: `CreateBookingDTO` with only required fields (no optional fields)
- **Expected**: 
  - Returns valid `PendingBookingResponseDTO`
  - Optional fields defaulted appropriately
  - Redis operations succeed

### HP-3: Create multiple pending bookings (different order codes)
- **Purpose**: Verify unique order code generation for multiple bookings
- **Mocks**: 
  - `generateOrderCode` → returns different codes: `11111111`, `22222222`
  - Redis mocks → resolve successfully for both
- **Input**: Two separate `CreateBookingDTO` objects
- **Expected**: 
  - First booking gets `orderCode: 11111111`
  - Second booking gets `orderCode: 22222222`
  - Both stored in Redis with different keys

### HP-4: Create pending booking with future date
- **Purpose**: Verify handling of future booking dates
- **Mocks**: 
  - `checkBookingConflict` → `{ hasConflict: false }`
  - `generateOrderCode` → `99999999`
  - Redis mocks → resolve
- **Input**: `bookingDate: new Date('2025-12-31T10:00:00')`
- **Expected**: 
  - Returns `PendingBookingResponseDTO` with future date
  - No conflict detected
  - Redis stores successfully

### HP-5: Create pending booking with long duration (240 minutes)
- **Purpose**: Verify handling of long service durations
- **Mocks**: 
  - `checkBookingConflict` with `duration: 240` → `{ hasConflict: false }`
  - `generateOrderCode` → `55555555`
  - Redis mocks → resolve
- **Input**: `duration: 240`
- **Expected**: 
  - Returns `PendingBookingResponseDTO` with `duration: 240`
  - Conflict check passes with 240-minute duration

----

## Edge cases (3 tests)

### EDGE-1: Booking at exact start of day (00:00)
- **Purpose**: Test boundary time value
- **Mocks**: 
  - `checkBookingConflict` → `{ hasConflict: false }`
  - `generateOrderCode` → `10000001`
  - Redis mocks → resolve
- **Input**: `bookingDate: new Date('2025-02-01T00:00:00')`
- **Expected**: 
  - Function handles midnight booking time
  - Returns valid `PendingBookingResponseDTO`

### EDGE-2: Very short duration (15 minutes)
- **Purpose**: Test minimum duration boundary
- **Mocks**: 
  - `checkBookingConflict` with `duration: 15` → `{ hasConflict: false }`
  - `generateOrderCode` → `10000002`
  - Redis mocks → resolve
- **Input**: `duration: 15`
- **Expected**: 
  - Returns `PendingBookingResponseDTO` with short duration
  - Conflict check handles 15-minute window

### EDGE-3: Maximum order code value
- **Purpose**: Test edge of order code range
- **Mocks**: 
  - `generateOrderCode` → `99999999` (max 8-digit number)
  - `checkBookingConflict` → `{ hasConflict: false }`
  - Redis mocks → resolve
- **Input**: Valid booking data
- **Expected**: 
  - Redis key uses max order code correctly
  - Function completes successfully

----

## Error scenarios (3 tests)

### ERR-1: Booking conflict detected (time slot already booked)
- **Purpose**: Verify error handling when slot is unavailable
- **Mocks**: 
  - `checkBookingConflict` → `{ hasConflict: true, conflictingBooking: { startTime: '10:00', endTime: '12:00', date: '2025-02-01' } }`
- **Input**: Valid `CreateBookingDTO` with conflicting time
- **Expected**: 
  - Function throws error with message containing conflict details
  - Error includes: "Booking conflict detected. There is already a booking from 10:00 to 12:00"
  - Redis operations NOT called

### ERR-2: Redis json.set fails
- **Purpose**: Verify error handling when Redis storage fails
- **Mocks**: 
  - `checkBookingConflict` → `{ hasConflict: false }`
  - `generateOrderCode` → `12340000`
  - `redisClient.json.set` → rejects with `Error('Redis connection lost')`
- **Input**: Valid booking data
- **Expected**: 
  - Function throws `Error('Failed to create booking: Error: Redis connection lost')`

### ERR-3: Redis expire fails
- **Purpose**: Verify error handling when setting expiry fails
- **Mocks**: 
  - `checkBookingConflict` → `{ hasConflict: false }`
  - `generateOrderCode` → `12340001`
  - `redisClient.json.set` → resolves successfully
  - `redisClient.expire` → rejects with `Error('Expire command failed')`
- **Input**: Valid booking data
- **Expected**: 
  - Function throws error containing "Failed to create booking"

----

## Integration with state (1 test)

### INT-1: Full realistic booking creation with Redis integration
- **Purpose**: Simulate complete pending booking creation flow
- **Mocks**: 
  - `checkBookingConflict` called with specific params → `{ hasConflict: false }`
  - `generateOrderCode` → `45678901`
  - `redisClient.json.set` → verify called with correct structure
  - `redisClient.expire` → verify called with 1800
- **Input**: 
  ```ts
  {
    customerId: 'cust_realistic_123',
    muaId: 'mua_realistic_456',
    serviceId: 'svc_realistic_789',
    bookingDate: new Date('2025-02-15T14:30:00'),
    duration: 90,
    totalPrice: 500,
    customerPhone: '+84901234567',
    notes: 'Please arrive 10 minutes early'
  }
  ```
- **Expected**: 
  - `checkBookingConflict` called with `('mua_realistic_456', bookingDate, 90)`
  - Booking created with `status: 'PENDING'`
  - Returns complete `PendingBookingResponseDTO`:
    ```ts
    {
      _id: expect.any(String),
      customerName: expect.any(String),
      serviceName: expect.any(String),
      status: 'PENDING',
      bookingDate: '2025-02-15T14:30:00',
      duration: 90,
      totalPrice: 500,
      customerPhone: '+84901234567',
      orderCode: 45678901,
      notes: 'Please arrive 10 minutes early'
    }
    ```
  - Redis key set to `booking:pending:45678901`
  - Redis data is JSON stringified properly
  - Expiry set to exactly 1800 seconds
  - All fields preserved through formatting

----

## Notes for test authors

**Key differences from other functions:**
- Does NOT save to MongoDB database
- Stores in Redis with temporary expiry (30 minutes)
- Includes `orderCode` generation
- Includes `customerPhone` in response (not in regular booking)
- Still checks for conflicts before creating
- Creates Booking instance but doesn't `.save()` it

**Mocking Redis:**
```ts
import { redisClient } from '../src/config/redis';

jest.mock('../src/config/redis', () => ({
  redisClient: {
    json: {
      set: jest.fn().mockResolvedValue('OK')
    },
    expire: jest.fn().mockResolvedValue(1)
  }
}));
```

**Mocking other dependencies:**
```ts
// Mock checkBookingConflict (internal function, mock via module)
jest.spyOn(bookingService as any, 'checkBookingConflict')
  .mockResolvedValue({ hasConflict: false });

// Mock generateOrderCode (from transaction.service)
jest.mock('../src/services/transaction.service', () => ({
  generateOrderCode: jest.fn(() => 12345678)
}));
```

**Assertions to verify:**
- Conflict check called with correct params
- Order code generated
- Redis set called with correct key format
- Redis data structure matches expected
- Expiry set to 1800 seconds
- Returned DTO includes orderCode and customerPhone

**Error testing:**
```ts
await expect(createRedisPendingBooking(data))
  .rejects.toThrow('Failed to create booking:');
```

----

## Implementation checklist

- [ ] HP-1: Valid booking creation
- [ ] HP-2: Minimum required fields
- [ ] HP-3: Multiple bookings (unique codes)
- [ ] HP-4: Future date booking
- [ ] HP-5: Long duration (240 min)
- [ ] EDGE-1: Midnight booking time
- [ ] EDGE-2: Short duration (15 min)
- [ ] EDGE-3: Max order code value
- [ ] ERR-1: Booking conflict
- [ ] ERR-2: Redis set fails
- [ ] ERR-3: Redis expire fails
- [ ] INT-1: Full realistic flow

Total: 12 test cases
