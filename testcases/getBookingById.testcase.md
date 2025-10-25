# Test Case Specification — getBookingById

Service under test: `src/services/booking.service.ts#getBookingById(bookingId: string)`

Primary behavior:

- Fetch a booking by ID from the database (`Booking.findById(id).populate(...).exec()`)
- Return a formatted DTO via `formatBookingResponse(booking)` when found
- Return `null` when not found
- Wrap and rethrow unexpected errors with a clear message

## Dependencies and mocks

- Booking model (mongoose):
  - `findById(id)` returning a chainable query supporting `.populate().exec()`
  - Typical populate paths: `customerId`, `muaId`, `serviceId` (adapt to actual service code)
- `formatBookingResponse(booking)` from the formatter utility

Recommended mock pattern:

- Implement a minimal chainable query mock: `{ populate: jest.fn().mockReturnThis(), exec: jest.fn() }`
- `Booking.findById` returns this query instance; `exec` resolves to either a booking document or `null`
- `formatBookingResponse` is a simple jest mock that returns a predictable DTO shape

## Conventions

- Test ordering within the suite: Happy → Edge → Error → Integration
- Test name prefixes:
  - Happy: `HP-GBI-#`
  - Edge: `EDGE-GBI-#`
  - Error: `ERR-GBI-#`
  - Integration-like: `INT-GBI-1`
- Structure each case as Arrange / Act / Assert

## Happy path scenarios (5)

1. HP-GBI-1: returns formatted booking when found

- Arrange: `Booking.findById` → query; `query.exec` resolves to a full booking doc; `formatBookingResponse` returns a shaped DTO
- Act: call `getBookingById(id)`
- Assert: returns the formatter’s DTO; `formatBookingResponse` called once with the found booking

2. HP-GBI-2: populates related refs before formatting

- Arrange: same as above
- Act: call `getBookingById(id)`
- Assert: `query.populate` called with expected paths (customer, service, and/or MUA per implementation); `formatBookingResponse` called after populate

3. HP-GBI-3: accepts string ObjectId and forwards correctly to DB

- Arrange: spy on `Booking.findById`
- Act: call with a string `_id`
- Assert: `Booking.findById` called exactly once with the given string

4. HP-GBI-4: respects formatter output shape

- Arrange: custom `formatBookingResponse` to return a known DTO (e.g., `{ id, customerName, start, end, status }`)
- Act: call `getBookingById(id)`
- Assert: the returned object strictly equals the mock DTO

5. HP-GBI-5: makes only one DB fetch for the entity

- Arrange: track calls to `findById`, `exec`
- Act: call `getBookingById(id)`
- Assert: `findById` called once, `exec` called once; no other model methods invoked

## Edge cases (3)

1. EDGE-GBI-1: booking not found → returns null

- Arrange: `query.exec` resolves to `null`
- Act: call `getBookingById(id)`
- Assert: returns `null`; `formatBookingResponse` not called

2. EDGE-GBI-2: empty or whitespace ID returns null (or gracefully handles)

- Arrange: pass `''` or whitespace; `findById` may still be invoked depending on implementation; choose expectations that match service behavior
- Act: call with invalid ID
- Assert: Either returns `null` or throws a validation error—align with actual implementation. Prefer return `null` if service is permissive.

3. EDGE-GBI-3: minimal booking doc still formats

- Arrange: `exec` resolves to a minimal doc (just `_id` and required fields); `formatBookingResponse` returns DTO
- Act: call `getBookingById(id)`
- Assert: success; formatter invoked with minimal doc

## Error scenarios (3)

1. ERR-GBI-1: formatter throws → service surfaces a wrapped error

- Arrange: `exec` resolves to a valid doc; `formatBookingResponse` throws `new Error('format fail')`
- Act: call `getBookingById(id)`
- Assert: rejects with error whose message contains `Failed to get booking` (or the service’s chosen prefix), and original reason included

2. ERR-GBI-2: DB `exec` rejects

- Arrange: `exec` rejects with `new Error('db failure')`
- Act: call `getBookingById(id)`
- Assert: rejects with a wrapped error message matching service behavior

3. ERR-GBI-3: populate chain throws synchronously

- Arrange: make `query.populate` throw; `exec` should never be called
- Act: call `getBookingById(id)`
- Assert: rejects; verify `exec` not called; message contains the service’s prefix

## Integration-like scenario (1)

1. INT-GBI-1: chained query and formatting interaction

- Arrange: mock `findById` → `query.populate(...).populate(...).exec()` resolves to a booking; `formatBookingResponse` returns DTO
- Act: call `getBookingById(id)`
- Assert: ensures the sequence occurred (populate called, then exec, then formatter). Return value equals DTO; zero unexpected DB calls

## Notes on mocking shapes

- Booking document minimal shape for tests:

```ts
{
  _id: 'b1',
  customerId: { _id: 'u1', name: 'Alice' },
  muaId: { _id: 'm1', name: 'Mia' },
  serviceId: { _id: 's1', name: 'Bridal' },
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T12:00:00Z'),
  status: 'CONFIRMED'
}
```

- DTO from `formatBookingResponse` can be simplified to:

```ts
{
  id: 'b1',
  customerName: 'Alice',
  serviceName: 'Bridal',
  start: '2024-01-01T10:00:00.000Z',
  end: '2024-01-01T12:00:00.000Z',
  status: 'CONFIRMED'
}
```

## Acceptance criteria

- Exactly 12 unit tests plus 1 integration-like test are specified as above
- Each test follows Arrange/Act/Assert with the stated prefixes and ordering
- Uses chainable query mock for `findById().populate().exec()` and a stubbed `formatBookingResponse`
- Clearly differentiates returns `null` vs. thrown errors per implementation
- Ready to be translated into Jest tests under `tests/` using the existing mocking pattern from `booking_create_crud.test.ts`
