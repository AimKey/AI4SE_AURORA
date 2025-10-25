````markdown
# updateBooking.testcase.md

Target: `src/services/booking.service.ts#updateBooking(bookingId: string, updateData: UpdateBookingDTO): Promise<BookingResponseDTO | null>`

Scope: Unit tests covering update logic, conflict checking behavior, null/not-found handling, and formatter mapping. Avoid IO; mock DB models and external services. Leave Day.js unmocked.

## Dependencies to mock

- Booking model (from `src/models/bookings.models`):
  - `Booking.findById(bookingId).exec()` → returns the current booking or throws
  - `Booking.find(filter).exec()` → used by the internal `checkBookingConflict` helper
  - `Booking.findByIdAndUpdate(...).populate(...).exec()` → returns updated booking or null
- `formatBookingResponse(updatedBooking)` (from `src/utils/booking.formatter`)

Note on conflict checking: `checkBookingConflict` is not exported. Simulate conflict/no-conflict by controlling `Booking.find` to return overlapping/non-overlapping bookings matching time math in the helper.

## Global setup/teardown (per test file)

- Provide chainable query mock helper `{ populate().skip().limit().sort().exec() }` reused across tests
- Use a shared current booking baseline returned by `Booking.findById(...).exec()`:
  ```ts
  const current = {
    _id: 'b-1',
    muaId: 'm-1',
    customerId: 'c-1',
    serviceId: 's-1',
    bookingDate: new Date('2024-01-01T10:00:00Z'),
    duration: 60,
    status: 'PENDING',
  };
  ```
- Before each test: `jest.clearAllMocks()` and reset statics/returns to defaults (no conflict, found current booking, happy update path)

---

## Happy path scenarios (3 tests)

1. HP-UB-1: updates non-time fields (e.g., address) without triggering conflict check; returns formatted result

- Arrange:
  - `Booking.findById` → resolves `current`
  - `updateData = { address: '123 Street' }`
  - `Booking.findByIdAndUpdate(...).populate(...).exec()` → resolves `updated = { ...current, address: '123 Street' }`
- Act: `await updateBooking('b-1', updateData)`
- Assert:
  - Conflict checker should not be exercised (no `bookingDate/duration/muaId` in updateData)
  - `formatBookingResponse(updated)` called and its value returned

2. HP-UB-2: updates duration only; conflict check uses current booking's muaId and bookingDate; returns formatted

- Arrange:
  - `Booking.findById` → resolves `current`
  - `updateData = { duration: 90 }`
  - Simulate no conflict by making `Booking.find` return [] inside conflict checker
  - `Booking.findByIdAndUpdate` → resolves `{ ...current, duration: 90 }`
- Assert: formatted result returned; conflict path executed successfully

3. HP-UB-3: updates multiple time-affecting fields (muaId + bookingDate); conflict check passes; `updatedAt` set; populated mapping applied

- Arrange:
  - `updateData = { muaId: 'm-2', bookingDate: new Date('2024-01-02T09:00:00Z') }`
  - `Booking.find` returns [] (no conflict)
  - `Booking.findByIdAndUpdate` resolves populated doc `{ ...current, ...updateData }`
- Assert: `formatBookingResponse` called once; result matches updated fields

## Edge cases (3 tests)

1. EDGE-UB-1: current booking not found → returns null

- Arrange: `Booking.findById` resolves `null`
- Act/Assert: `updateBooking('missing', {...})` resolves `null`; no update call performed

2. EDGE-UB-2: conflict check required data missing → throws specific error

- Arrange:
  - `Booking.findById` resolves a `current` missing `muaId` (or with `muaId = null`)
  - `updateData` includes a time-related field that triggers check (e.g., `{ bookingDate: new Date(...) }`) but does not provide `muaId`
- Act/Assert: rejects with `Missing required booking data for conflict check`

3. EDGE-UB-3: findByIdAndUpdate returns null → returns null (updated document not found)

- Arrange:
  - `Booking.findById` resolves `current`
  - No conflict (or not triggered)
  - `Booking.findByIdAndUpdate(...).populate(...).exec()` resolves `null`
- Act/Assert: `updateBooking` returns `null`

## Error scenarios (3 tests)

1. ERR-UB-1: conflict detected by checker → throws message containing `Booking conflict detected`

- Arrange:
  - `Booking.findById` resolves `current`
  - `updateData` includes `duration` (or `bookingDate`/`muaId`) to trigger checker
  - Configure `Booking.find` used by checker to return an overlapping booking (e.g., existing 10:00–11:00 vs new 10:30–11:30)
- Act/Assert: rejects with message matching `Booking conflict detected`

2. ERR-UB-2: DB error during `findByIdAndUpdate().exec()` is wrapped → `Failed to update booking`

- Arrange:
  - `Booking.findById` resolves `current`
  - No conflict
  - `Booking.findByIdAndUpdate().populate().exec()` rejects with `new Error('db failure')`
- Act/Assert: rejects with `/Failed to update booking/`

3. ERR-UB-3: DB error during `findById().exec()` is wrapped → `Failed to update booking`

- Arrange: `Booking.findById().exec()` rejects
- Act/Assert: rejects with `/Failed to update booking/`

## Integration with cart/state (1 test)

1. INT-UB-1: deterministic behavior independent of global state

- Arrange:
  - `Booking.findById` resolves `current`
  - `Booking.find` returns [] (no conflict)
  - `Booking.findByIdAndUpdate` resolves a stable updated doc
  - Mutate some unrelated global state between two calls (e.g., `(global as any).cart = {...}`)
- Act: call `updateBooking` twice with same inputs
- Assert: both results deep-equal; confirms independence from external/global state

---

## Helper/mocking notes

- Reuse chainable query helper and Booking mock factory as in `booking_create_crud.test.ts`
- Simulating conflict in checker:
  - Existing booking: `{ bookingDate: '2024-01-01T10:00:00Z', duration: 60 }`
  - New booking (from `updateData` + current): `10:30–11:30`
  - Configure `Booking.find` to return `[existing]` during checker
- Keep `formatBookingResponse` mocked to return a simple DTO for assertion

## Acceptance criteria

- Exactly 10 tests implemented matching titles and intent
- Cover branches: not-found current, conflict guard missing data, conflict found, successful update, not-found after update, DB exceptions
- No real DB/Redis access
- Tests pass under Jest and increase coverage for `updateBooking`
````
