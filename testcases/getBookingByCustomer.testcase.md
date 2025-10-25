# Test Case Specification — getBookingsByCustomer

Service under test: `src/services/booking.service.ts#getBookingsByCustomer(customerId: string, page?: number, pageSize?: number)`

Primary behavior:

- Query bookings for a specific customer with pagination: `Booking.find({ customerId }).populate(...).skip(skip).limit(pageSize).sort({ bookingDate: -1 }).exec()`
- Count total documents for that customer via `Booking.countDocuments({ customerId })`
- Map each result via `formatBookingResponse`
- Return `{ bookings, total, page, totalPages }` with `totalPages = Math.ceil(total / pageSize)`
- Wrap and rethrow unexpected errors with `Failed to get customer bookings: ...`

## Dependencies and mocks

- Booking model (mongoose):
  - `find({ customerId })` → chainable query supporting `.populate().skip().limit().sort().exec()`
  - `countDocuments({ customerId })` → resolves to a numeric total
- Formatter: `formatBookingResponse(booking)`

Recommended mock pattern:

- `makeQuery(result)` returns a chainable mock: `{ populate: fn→this, skip: fn→this, limit: fn→this, sort: fn→this, exec: fn→Promise(result), lean: fn→Promise(result) }`
- `Booking.find` should return this query; `Booking.countDocuments` resolves `Promise<number>`
- `formatBookingResponse` returns a stable DTO for straightforward assertions

## Conventions

- Test ordering: Happy → Edge → Error → Integration
- Name prefixes:
  - Happy: `HP-GBC-#`
  - Edge: `EDGE-GBC-#`
  - Error: `ERR-GBC-#`
  - Integration-like: `INT-GBC-1`
- Each test follows Arrange / Act / Assert

## Happy path scenarios (5)

1. HP-GBC-1: returns formatted bookings and correct pagination defaults

- Arrange: customerId='c-1'; `find.exec` → 2 docs; `countDocuments` → 2; page/pageSize omitted
- Act: call `getBookingsByCustomer('c-1')`
- Assert: `{ bookings: [DTO, DTO], total: 2, page: 1, totalPages: 1 }`; formatter called twice

2. HP-GBC-2: applies customerId filter to both find and count

- Arrange: spy inputs
- Act: call with `customerId='c-2'`
- Assert: `Booking.find({ customerId: 'c-2' })` and `Booking.countDocuments({ customerId: 'c-2' })` each called once

3. HP-GBC-3: respects skip/limit from page and pageSize

- Arrange: page=3, pageSize=4 → skip=8; capture query instance
- Act: call `getBookingsByCustomer('c-3', 3, 4)`
- Assert: `.skip(8)` and `.limit(4)` called

4. HP-GBC-4: sorts by bookingDate descending

- Arrange: capture query instance
- Act: call
- Assert: `.sort({ bookingDate: -1 })` called once

5. HP-GBC-5: populates relations before mapping

- Arrange: capture query, docs length 2
- Act: call
- Assert: `.populate('customerId serviceId')` called; `exec` called once; formatter called twice

## Edge cases (3)

1. EDGE-GBC-1: empty list yields empty results/zero totals

- Arrange: `find.exec` → []; `countDocuments` → 0
- Act: call
- Assert: `{ bookings: [], total: 0, totalPages: 0 }`; formatter not called

2. EDGE-GBC-2: single-item page size produces correct totalPages

- Arrange: `countDocuments` → 5; `pageSize=1`
- Act: call with `pageSize=1`
- Assert: `totalPages` equals 5

3. EDGE-GBC-3: page beyond last returns empty page but preserves metadata

- Arrange: total=6, pageSize=2 → totalPages=3; request page=4; `find.exec` → []
- Act: call
- Assert: `{ bookings: [], total: 6, page: 4, totalPages: 3 }`

## Error scenarios (3)

1. ERR-GBC-1: formatter throws for an item → wrapped error

- Arrange: `find.exec` → [doc]; `countDocuments` → 1; `formatBookingResponse` throws
- Act: call
- Assert: rejects with message containing `Failed to get customer bookings`

2. ERR-GBC-2: DB query (`exec`) rejects

- Arrange: `find.exec` rejects with `new Error('db failure')`
- Act: call
- Assert: rejects with wrapped error message

3. ERR-GBC-3: `countDocuments` rejects

- Arrange: `countDocuments` rejects with `new Error('count failure')`
- Act: call
- Assert: rejects with wrapped error message

## Integration-like scenario (1)

1. INT-GBC-1: end-to-end flow with pagination and mapping

- Arrange: customerId='c-int', page=2, pageSize=3 → skip=3; `find.exec` → 3 docs; `countDocuments` → 9; formatter returns DTOs
- Act: call
- Assert: `.find({ customerId:'c-int' }).populate(...).skip(3).limit(3).sort({ bookingDate:-1 }).exec()` invoked; `countDocuments({ customerId:'c-int' })` invoked; returns `{ bookings: [DTO, DTO, DTO], total: 9, page: 2, totalPages: 3 }`

## Notes on mocking shapes

- Minimal booking doc example:

```ts
{ _id: 'b1', bookingDate: new Date(), customerId: { _id: 'c-1' }, serviceId: { _id: 's-1' } }
```

- Formatter DTO example:

```ts
{ _id: 'b1', customerId: 'c-1', serviceId: 's-1', bookingDate: '2024-01-01', startTime: '09:00', endTime: '10:00', duration: 60 }
```

## Acceptance criteria

- Exactly 12 unit tests plus 1 integration-like test are specified
- Tests follow Arrange/Act/Assert and stated prefixes and order
- Uses chainable query mock and stubbed `formatBookingResponse`
- Verifies filter application, pagination math, sorting, and mapping
- Ready to translate into Jest tests in `tests/booking_create_crud.test.ts` following the established mocking pattern
