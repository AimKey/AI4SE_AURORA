# getRedisPendingBooking() — Test Cases

This file documents unit test cases for:

```ts
export async function getRedisPendingBooking(orderCode: number): Promise<PendingBookingResponseDTO | null>
```

## Behavior Summary

**Purpose**: Lấy thông tin pending booking từ Redis cache theo orderCode

**Flow**:
1. Build cache key: `booking:pending:${orderCode}`
2. Call `redisClient.json.get(cacheKey)` to retrieve data
3. Return result as `PendingBookingResponseDTO | null`

**Key Points**:
- Simple read operation from Redis JSON
- Returns `null` if key doesn't exist or expired
- Wraps errors with context: `"Failed to get booking: ..."`
- No validation on orderCode format (accepts any number)

---

## Test Structure

Each test case includes:
- **Title** — Short descriptive name
- **Purpose** — What behavior to verify
- **Mocks/Preconditions** — How to stub `redisClient.json.get`
- **Input** — orderCode value
- **Expected Output** — Return value or error
- **Steps** — Arrange / Act / Assert

---

## Happy Path Scenarios (5 tests)

### HP-1: Successfully retrieve existing pending booking
**Purpose**: Verify normal retrieval of cached booking data

**Mocks**:
```typescript
const mockPendingBooking: PendingBookingResponseDTO = {
  _id: 'booking123',
  customerId: 'cust456',
  muaId: 'mua789',
  serviceId: 'svc101',
  bookingDate: new Date('2025-11-01T09:00:00Z'),
  duration: 120,
  status: 'pending',
  totalPrice: 500000,
  customerPhone: '0912345678',
  orderCode: 12345,
  // ... other fields
};

jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue(mockPendingBooking);
```

**Input**: `orderCode = 12345`

**Expected Output**: 
- Returns `PendingBookingResponseDTO` object matching mock data
- Cache key called: `"booking:pending:12345"`

**Assertions**:
```typescript
const result = await getRedisPendingBooking(12345);
expect(redisClient.json.get).toHaveBeenCalledWith('booking:pending:12345');
expect(result).toEqual(mockPendingBooking);
expect(result?.orderCode).toBe(12345);
```

---

### HP-2: Return null when booking not found (expired or never existed)
**Purpose**: Verify graceful handling when Redis key doesn't exist

**Mocks**:
```typescript
jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue(null);
```

**Input**: `orderCode = 99999`

**Expected Output**: `null`

**Assertions**:
```typescript
const result = await getRedisPendingBooking(99999);
expect(redisClient.json.get).toHaveBeenCalledWith('booking:pending:99999');
expect(result).toBeNull();
```

---

### HP-3: Retrieve booking with minimal data structure
**Purpose**: Test with pending booking containing only required fields

**Mocks**:
```typescript
const minimalBooking: PendingBookingResponseDTO = {
  _id: 'b1',
  customerId: 'c1',
  muaId: 'm1',
  serviceId: 's1',
  bookingDate: new Date(),
  duration: 60,
  status: 'pending',
  totalPrice: 0,
  customerPhone: '',
  orderCode: 11111
};

jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue(minimalBooking);
```

**Input**: `orderCode = 11111`

**Expected Output**: Returns minimal booking object without errors

---

### HP-4: Retrieve booking with complete data (all optional fields populated)
**Purpose**: Test with fully populated pending booking data

**Mocks**:
```typescript
const completeBooking: PendingBookingResponseDTO = {
  _id: 'booking-full-123',
  customerId: 'customer-456',
  customerName: 'Nguyễn Văn A',
  customerPhone: '0901234567',
  muaId: 'mua-789',
  muaName: 'MUA Expert',
  serviceId: 'service-101',
  serviceName: 'Bridal Makeup Package',
  bookingDate: new Date('2025-12-25T14:00:00Z'),
  duration: 180,
  status: 'pending',
  totalPrice: 1500000,
  locationType: 'customer_location',
  address: '123 Nguyễn Huệ, Q1, TPHCM',
  notes: 'Special requirements: Natural look',
  orderCode: 54321,
  createdAt: new Date('2025-10-25T10:00:00Z')
};

jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue(completeBooking);
```

**Input**: `orderCode = 54321`

**Expected Output**: 
- Returns complete booking with all fields intact
- Verify customerPhone and orderCode are included

---

### HP-5: Retrieve booking multiple times (cache hit consistency)
**Purpose**: Verify consistent results on repeated reads

**Mocks**:
```typescript
const cachedBooking: PendingBookingResponseDTO = {
  _id: 'b-cache-test',
  orderCode: 77777,
  // ... other fields
};

const getSpy = jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue(cachedBooking);
```

**Input**: Call `getRedisPendingBooking(77777)` three times

**Expected Output**: 
- All three calls return same booking data
- `redisClient.json.get` called 3 times with same key

**Assertions**:
```typescript
const result1 = await getRedisPendingBooking(77777);
const result2 = await getRedisPendingBooking(77777);
const result3 = await getRedisPendingBooking(77777);

expect(result1).toEqual(result2);
expect(result2).toEqual(result3);
expect(getSpy).toHaveBeenCalledTimes(3);
```

---

## Edge Cases (3 tests)

### EDGE-1: Very large orderCode (boundary value)
**Purpose**: Test with maximum safe integer value

**Mocks**:
```typescript
const largeOrderCode = Number.MAX_SAFE_INTEGER; // 9007199254740991

jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue({
    _id: 'b-large',
    orderCode: largeOrderCode,
    // ... other fields
  } as PendingBookingResponseDTO);
```

**Input**: `orderCode = 9007199254740991`

**Expected Output**: 
- Cache key: `"booking:pending:9007199254740991"`
- Function executes without errors
- Returns booking with large orderCode

---

### EDGE-2: OrderCode with leading zeros (number type coercion)
**Purpose**: Verify JavaScript number handling (e.g., 00123 → 123)

**Mocks**:
```typescript
jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue({
    _id: 'b-zeros',
    orderCode: 123, // After coercion
    // ... other fields
  } as PendingBookingResponseDTO);
```

**Input**: `orderCode = 00123` (JavaScript converts to 123)

**Expected Output**: 
- Cache key: `"booking:pending:123"` (not "00123")
- Returns booking successfully

---

### EDGE-3: Redis returns malformed data (not matching DTO structure)
**Purpose**: Test resilience when Redis contains unexpected data format

**Mocks**:
```typescript
// Redis returns object missing required fields
jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue({
    _id: 'malformed',
    // Missing customerId, muaId, etc.
    randomField: 'unexpected'
  } as any);
```

**Input**: `orderCode = 88888`

**Expected Output**: 
- Function returns the malformed object (no validation)
- TypeScript typing may not match runtime data
- *Note*: Function doesn't validate data structure, trusts Redis content

---

## Error Scenarios (3 tests)

### ERR-1: Redis connection failure
**Purpose**: Verify error handling when Redis is unreachable

**Mocks**:
```typescript
jest.spyOn(redisClient.json, 'get')
  .mockRejectedValue(new Error('ECONNREFUSED - Redis server not available'));
```

**Input**: `orderCode = 12345`

**Expected Error**: 
```typescript
await expect(getRedisPendingBooking(12345))
  .rejects
  .toThrow('Failed to get booking: Error: ECONNREFUSED - Redis server not available');
```

**Assertions**:
- Error message starts with `"Failed to get booking:"`
- Original error details preserved

---

### ERR-2: Redis timeout during read operation
**Purpose**: Test behavior when Redis operation times out

**Mocks**:
```typescript
jest.spyOn(redisClient.json, 'get')
  .mockRejectedValue(new Error('Command timed out after 5000ms'));
```

**Input**: `orderCode = 55555`

**Expected Error**: 
```typescript
await expect(getRedisPendingBooking(55555))
  .rejects
  .toThrow('Failed to get booking:');
```

---

### ERR-3: Redis throws non-Error object (edge error case)
**Purpose**: Verify error wrapping handles unexpected error types

**Mocks**:
```typescript
jest.spyOn(redisClient.json, 'get')
  .mockRejectedValue('String error instead of Error object');
```

**Input**: `orderCode = 99999`

**Expected Error**: 
```typescript
await expect(getRedisPendingBooking(99999))
  .rejects
  .toThrow('Failed to get booking: String error instead of Error object');
```

---

## Integration Test (1 test)

### INT-1: Full flow - verify cache key format and data integrity
**Purpose**: End-to-end test simulating real Redis interaction

**Scenario**:
1. Pending booking was previously created with orderCode `12345`
2. Now retrieving it from Redis
3. Verify complete data round-trip

**Mocks**:
```typescript
const originalBookingData: PendingBookingResponseDTO = {
  _id: new mongoose.Types.ObjectId().toString(),
  customerId: new mongoose.Types.ObjectId().toString(),
  customerName: 'Trần Thị B',
  customerPhone: '0987654321',
  muaId: new mongoose.Types.ObjectId().toString(),
  muaName: 'Beauty Expert MUA',
  serviceId: new mongoose.Types.ObjectId().toString(),
  serviceName: 'Wedding Makeup',
  bookingDate: new Date('2025-11-15T10:30:00Z'),
  duration: 150,
  status: 'pending',
  totalPrice: 2000000,
  locationType: 'mua_location',
  address: '456 Lê Lợi, Q1, TPHCM',
  notes: 'Bride prefers soft makeup',
  orderCode: 12345,
  createdAt: new Date('2025-10-25T08:00:00Z')
};

const getSpy = jest.spyOn(redisClient.json, 'get')
  .mockResolvedValue(originalBookingData);
```

**Input**: `orderCode = 12345`

**Expected Output & Assertions**:
```typescript
const result = await getRedisPendingBooking(12345);

// 1. Verify cache key format
expect(getSpy).toHaveBeenCalledWith('booking:pending:12345');
expect(getSpy).toHaveBeenCalledTimes(1);

// 2. Verify data integrity
expect(result).toEqual(originalBookingData);
expect(result?._id).toBe(originalBookingData._id);
expect(result?.orderCode).toBe(12345);
expect(result?.customerPhone).toBe('0987654321');

// 3. Verify type safety (PendingBookingResponseDTO)
expect(result).toHaveProperty('orderCode');
expect(result).toHaveProperty('customerPhone');

// 4. Verify date preservation
expect(result?.bookingDate).toEqual(originalBookingData.bookingDate);
expect(result?.createdAt).toEqual(originalBookingData.createdAt);

// 5. Verify all critical fields present
expect(result?.customerId).toBeTruthy();
expect(result?.muaId).toBeTruthy();
expect(result?.serviceId).toBeTruthy();
expect(result?.totalPrice).toBeGreaterThan(0);
```

---

## Notes for Test Implementation

### Mock Setup Pattern
```typescript
import { redisClient } from '../src/config/redis';
import * as bookingService from '../src/services/booking.service';

// Mock Redis client
jest.mock('../src/config/redis', () => ({
  redisClient: {
    json: {
      get: jest.fn(),
    }
  }
}));

describe('getRedisPendingBooking (Service)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  // Tests here...
});
```

### Key Testing Points
1. **Cache Key Format**: Always `booking:pending:${orderCode}`
2. **Null Handling**: Function returns `null` when key doesn't exist
3. **Error Wrapping**: All errors wrapped with `"Failed to get booking:"` prefix
4. **No Validation**: Function doesn't validate orderCode or returned data structure
5. **Type Casting**: Redis response cast to `PendingBookingResponseDTO | null`

### Error Testing Pattern
```typescript
await expect(getRedisPendingBooking(orderCode))
  .rejects
  .toThrow('Failed to get booking:');
```

### Success Testing Pattern
```typescript
const result = await getRedisPendingBooking(orderCode);
expect(redisClient.json.get).toHaveBeenCalledWith(`booking:pending:${orderCode}`);
expect(result).toEqual(expectedBookingData);
```

---

## Implementation Checklist

- [ ] HP-1: Successfully retrieve existing booking
- [ ] HP-2: Return null when not found
- [ ] HP-3: Minimal data structure
- [ ] HP-4: Complete data structure
- [ ] HP-5: Repeated reads consistency
- [ ] EDGE-1: Very large orderCode
- [ ] EDGE-2: Number coercion (leading zeros)
- [ ] EDGE-3: Malformed data from Redis
- [ ] ERR-1: Redis connection failure
- [ ] ERR-2: Redis timeout
- [ ] ERR-3: Non-Error object thrown
- [ ] INT-1: Full flow integration test

**Total: 12 test cases**

---

## Comparison with Related Functions

| Function | Purpose | Complexity | Redis Ops |
|----------|---------|------------|-----------|
| `createRedisPendingBooking` | Create + Store | High | SET + EXPIRE |
| **`getRedisPendingBooking`** | **Retrieve** | **Low** | **GET** |
| `deleteRedisPendingBooking` | Remove | Low | DEL |

**Key Difference**: `getRedisPendingBooking` is the simplest - pure read operation with no side effects or validation.