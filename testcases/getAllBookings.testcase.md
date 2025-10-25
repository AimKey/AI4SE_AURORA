# Test Case Specification — getAllBookings

Service under test: `src/services/booking.service.ts#getAllBookings(page?: number, pageSize?: number, status?: string)`

Primary behavior:

- Query bookings with optional status filter and pagination: `Booking.find(filter).populate(...).skip(skip).limit(pageSize).sort({ createdAt: -1 }).exec()`
- Count total documents with the same filter via `Booking.countDocuments(filter)`
- Format each booking with `formatBookingResponse`
- Return `{ bookings, total, page, totalPages }` where `totalPages = Math.ceil(total / pageSize)`
- Wrap and rethrow unexpected errors with `Failed to get bookings: ...`

## Dependencies and mocks

- Booking model (mongoose):
  - `find(filter)` returning a chainable query supporting `.populate().skip().limit().sort().exec()`
  - `countDocuments(filter)` resolving to a numeric total
- `formatBookingResponse(booking)` from the formatter utility

Recommended mock pattern:

- `makeQuery(result)` → `{ populate: fn→this, skip: fn→this, limit: fn→this, sort: fn→this, exec: fn→Promise(result), lean: fn→Promise(result) }`
- `Booking.find` returns this query instance; `countDocuments` returns a Promise<number>
- `formatBookingResponse` returns a stable DTO per booking for easy assertions

## Conventions

- Test ordering within the suite: Happy → Edge → Error → Integration
- Test name prefixes:
  - Happy: `HP-GAB-#`
  - Edge: `EDGE-GAB-#`
  - Error: `ERR-GAB-#`
  - Integration-like: `INT-GAB-1`
- Each test uses Arrange / Act / Assert

## Happy path scenarios (5)

1. HP-GAB-1: returns formatted bookings and correct pagination defaults

- Arrange: page omitted (defaults 1), pageSize omitted (defaults 10), `find.exec` → 2 docs, `countDocuments` → 2
- Act: call `getAllBookings()`
- Assert: returns `{ bookings: [DTO, DTO], total: 2, page: 1, totalPages: 1 }`; formatter called twice

2. HP-GAB-2: applies status filter when provided

- Arrange: status = 'CONFIRMED', `find` and `countDocuments` verify filter `{ status: 'CONFIRMED' }`
- Act: call with status
- Assert: both `find` and `countDocuments` invoked with the same filter

3. HP-GAB-3: respects skip/limit from page and pageSize

- Arrange: page = 2, pageSize = 5 → skip = 5; capture query to assert `.skip(5).limit(5)`
- Act: call with page and pageSize
- Assert: `.skip` called with 5 and `.limit` with 5

4. HP-GAB-4: sorts by createdAt descending

- Arrange: capture query
- Act: call
- Assert: `.sort({ createdAt: -1 })` called once

5. HP-GAB-5: populates relations before mapping

- Arrange: capture query
- Act: call
- Assert: `.populate('customerId serviceId')` called before `exec`; formatter called for each doc

## Edge cases (3)

1. EDGE-GAB-1: empty list yields empty results and zero totals

- Arrange: `find.exec` → [], `countDocuments` → 0
- Act: call
- Assert: `{ bookings: [], total: 0, totalPages: 0 }` and formatter not called

2. EDGE-GAB-2: single-item pages produce correct totalPages

- Arrange: pageSize = 1, `countDocuments` → 3
- Act: call with `pageSize=1`
- Assert: `totalPages` equals 3

3. EDGE-GAB-3: page beyond last returns empty page but preserves metadata

- Arrange: total = 5, pageSize = 2 → totalPages = 3; request page = 4; `find.exec` → []
- Act: call
- Assert: `{ bookings: [], total: 5, page: 4, totalPages: 3 }`

## Error scenarios (3)

1. ERR-GAB-1: formatter throws for an item → service wraps error

- Arrange: `find.exec` → [doc], `countDocuments` → 1; `formatBookingResponse` throws
- Act: call
- Assert: rejects with message containing `Failed to get bookings`

2. ERR-GAB-2: DB query (`exec`) rejects

- Arrange: `find.exec` rejects with `new Error('db failure')`
- Act: call
- Assert: rejects with wrapped error message

3. ERR-GAB-3: `countDocuments` rejects

- Arrange: `countDocuments` rejects with `new Error('count failure')`
- Act: call
- Assert: rejects with wrapped error message

## Integration with cart state (integration-like) (1)

1. INT-GAB-1: end-to-end query + count + map with status filter and pagination

- Arrange: status = 'PENDING', page = 3, pageSize = 2 → skip = 4; `find` returns 2 docs; `countDocuments` → 7; formatter returns DTOs
- Act: call
- Assert: `.find({ status:'PENDING' }).populate(...).skip(4).limit(2).sort({ createdAt:-1 }).exec()` invoked; `countDocuments({ status:'PENDING' })` invoked; returns `{ bookings: [DTO, DTO], total: 7, page: 3, totalPages: 4 }`

## Notes on mocking shapes

- Minimal booking doc example:

```ts
{ _id: 'b1', status: 'CONFIRMED', createdAt: new Date(), customerId: { _id: 'u1' }, serviceId: { _id: 's1' } }
```

- Formatter DTO example:

```ts
{ _id: 'b1', status: 'CONFIRMED', customerId: 'u1', serviceId: 's1', bookingDate: '2024-01-01', startTime: '09:00', endTime: '10:00', duration: 60 }
```

## Acceptance criteria

- Exactly 12 unit tests plus 1 integration-like test are specified as above
- Tests follow Arrange/Act/Assert, with prefixes and ordering as defined
- Uses chainable query mock for `.find().populate().skip().limit().sort().exec()` and a stubbed `formatBookingResponse`
- Verifies filter application, pagination math, sorting, and mapping
- Ready to translate into Jest tests in `tests/`, reusing the established mocking pattern from `tests/booking_create_crud.test.ts`
