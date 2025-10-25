# Test cases for BookingService.getAvailableServicesOfMuaByDay

Function signature:
- getAvailableServicesOfMuaByDay(muaId: string, day: string): Promise<ServiceResponseDTO[]>

Notes:
- Purpose: return the list of service packages (DTO) for a MUA that can fit into that day's available time windows.
- Key steps to exercise in tests:
  1. Load final slots for the week via `getFinalSlots(muaId, weekStart)`
  2. Convert the requested `day` via `fromUTC(day).format('YYYY-MM-DD')`
  3. Filter working slots (SLOT_TYPES.*) and booking slots (SLOT_TYPES.BOOKING)
  4. Subtract bookings from workings using `subtractBookedFromWorking`
  5. Filter out invalid ranges and compute slot durations
  6. Query `ServicePackage.find(...).lean()` for services and filter by duration

Mocks required for unit tests:
- `getFinalSlots` (src/services/schedule.service)
- `fromUTC` (src/utils/timeUtils)
- `ServicePackage.find(...).lean()` (src/models/services.models)
- `mongoose.Types.ObjectId` may be stubbed or left as-is if IDs are simple strings in tests

---

## Happy path scenarios (5)

HP-01 — Single working window fits single-service durations
- Setup:
  - finalSlots: one working slot for day "2025-10-20" 09:00–12:00, no bookings
  - services returned from ServicePackage.find: [ { _id: 'a', duration: 60 }, { _id: 'b', duration: 180 } ]
- Input: (m1, "2025-10-20")
- Expected: both services are returned (60 and 180 both fit in 180-min window)

HP-02 — Service too long excluded
- Setup:
  - working slot 09:00–10:00 (60 minutes)
  - services: [ { _id: 'a', duration: 90 }, { _id: 'b', duration: 60 } ]
- Expected: only service with duration 60 is returned

HP-03 — Multiple working windows allow different services to appear
- Setup:
  - workings: [08:00–09:00, 10:00–12:00]
  - bookings: none
  - services: durations [30, 45, 120]
- Expected: 30 and 45 return (fit in both windows); 120 returns (fits in 10:00–12:00)

HP-04 — Booking removal creates fit for previously-too-long service
- Setup:
  - working 09:00–12:00 and booking 10:00–11:30 -> available windows 09:00–10:00 and 11:30–12:00
  - service durations: 60 and 30
- Expected: 30-min service returned (fits into 09:00–10:00 and 11:30–12:00); 60-min might not (no contiguous 60-min window) -> only 30 returned

HP-05 — Sort/lean/transform returns DTO shape
- Setup:
  - working 09:00–11:00
  - ServicePackage.find returns documents with fields: _id (ObjectId), muaId, name, price, duration, imageUrl, isAvailable
- Expected: returned array contains DTOs with stringified _id, muaId as string, all fields mapped and isActive = isAvailable !== false

---

## Edge cases / boundary values (3)

EC-01 — Service with zero or undefined duration is excluded
- Setup: service list contains item with duration = 0 or missing duration
- Expected: those services are filtered out and not returned

EC-02 — Service fits exactly at boundary (duration == slot length)
- Setup: available slot 09:00–10:30 (90 minutes), service duration 90
- Expected: service included

EC-03 — Multiple bookings fragment working window such that only exact-fit services match
- Setup:
  - working 08:00–12:00
  - bookings: 09:00–09:30, 10:30–11:00 -> available windows 08:00–09:00, 09:30–10:30, 11:00–12:00
  - services: durations 60, 30
- Expected: 30-min services return (multiple fits); 60-min returned only if contiguous 60-min window exists (09:30–10:30 or 11:00–12:00)

---

## Error scenarios (3)

ER-01 — `getFinalSlots` throws -> propagate error
- Setup: mock getFinalSlots to throw new Error('DB down')
- Expected: function rejects with the error

ER-02 — `ServicePackage.find` returns malformed objects or throws
- Case A: returns docs missing `_id` or `duration` -> malformed items are filtered out; function still returns other valid services
- Case B: find() throws -> function rejects and propagates the error

ER-03 — Invalid day string results in empty list or error from `getMondayOfWeek`/`fromUTC`
- Setup: make `fromUTC` return invalid day string or make `getMondayOfWeek` throw
- Expected: either an empty result (no slots matched) or a rejected promise; assert behavior you prefer (test both options)

---

## Integration with cart/global state (1)

INT-01 — function result independent from unrelated global/cart state
- Setup:
  - finalSlots: working 09:00–11:00, no bookings
  - ServicePackage.find: [ { _id: 'a', duration: 60 } ]
  - set global.cart = { items: [...] }
- Steps:
  1. Call getAvailableServicesOfMuaByDay(m1, '2025-10-20') -> R1
  2. Mutate global.cart (push/pop items)
  3. Call again -> R2
- Expected: R1 deep-equals R2

---

## Implementation / mocking notes
- Use Jest module mocks:
  - jest.mock('src/services/schedule.service', () => ({ getFinalSlots: jest.fn() }))
  - jest.mock('src/utils/timeUtils', () => ({ fromUTC: jest.fn() }))
  - jest.mock('src/models/services.models', () => ({ ServicePackage: { find: jest.fn(() => ({ select: () => ({ sort: () => ({ lean: jest.fn() }) }) })) } }))
- Return simple POJO slots and service docs in tests to avoid hitting Mongo or mongoose ObjectId conversion; if necessary, mock `mongoose.Types.ObjectId` or return `muaId` as plain string in the mocked services.
- Validate outputs:
  - returned array length and included _id strings
  - properties: name, duration, price, imageUrl, isActive mapping
  - that services with duration > any contiguous slot are excluded
- Use deterministic ISO dates (YYYY-MM-DD) and dayjs for time math in test assertions.

If you'd like, I can scaffold Jest test file(s) implementing these cases, mock wiring, and run them locally. Which tests should I generate first?  