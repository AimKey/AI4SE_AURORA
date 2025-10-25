# createBooking.testcase.md

Target: `src/services/booking.service.ts#createBooking(bookingData: CreateBookingDTO): Promise<BookingResponseDTO>`

Scope: Unit-level tests for createBooking focusing on logic, side-effects, and formatting. Avoid IO/network; mock DB models and external services. Do not mock day/time library.

## Dependencies to mock

- Booking model (from `src/models/bookings.models`):
  - Constructor `new Booking({...})` (capture payload)
  - Instance `.save()` (resolve with `{ _id, ... }`)
  - Statics used after save: `Booking.findById(...).populate(...).exec()`
  - Statics used by conflict checker (indirectly): `Booking.find(...).exec()` if needed
- Mongoose `model('User')`:
  - `findById(...).exec()` returning a user doc or null
  - user `.save()` to persist phone number
- `invalidateWeeklyCache(muaId: string, day: Date)` (from `src/services/slot.service`)
- `formatBookingResponse(populatedBooking)` (from `src/utils/booking.formatter`)
- Note on `checkBookingConflict`:
  - If exported: spy and mock return `{ hasConflict: boolean, conflictingBooking?: {...} }`
  - If not exported: simulate conflict/no-conflict by controlling `Booking.find` used inside it and choosing overlapping/non-overlapping times

## Global setup/teardown (per test file)

- Setup Jest mocks for the above dependencies
- Provide a chainable query mock helper: `{ populate().skip().limit().sort().exec() }`
- Use a shared base input object `baseData`:
  ```ts
  const baseData = {
    muaId: 'm-1',
    customerId: 'c-1',
    customerPhone: '0123456789',
    serviceId: 's-1',
    bookingDate: new Date('2024-01-01T09:00:00Z'),
    duration: 60,
    type: 'NORMAL',
  };
  ```
- Before each test: `jest.clearAllMocks()` and reset statics/returns to defaults (no conflict, found user, populated booking available)

---

## Happy path scenarios (5 tests)

1. HP-1: Creates booking when no conflict; updates customer phone; invalidates cache; returns formatted response

- Arrange:
  - `checkBookingConflict` → no conflict (or `Booking.find` returns [])
  - `new Booking()` captures payload with status PENDING; `.save()` resolves `{ _id: 'saved-id', ... }`
  - `model('User').findById(customerId).exec()` resolves a user doc with `.save()` spy
  - `Booking.findById('saved-id').populate(...).exec()` resolves a populated booking doc
- Act: `await createBooking(baseData)`
- Assert:
  - Constructor called with `{ ...baseData, status: PENDING }`
  - User `phoneNumber` updated to `customerPhone` and `user.save()` called
  - `invalidateWeeklyCache(muaId, bookingDate)` called once
  - `formatBookingResponse(populatedDoc)` called and its result returned

2. HP-2: Uses populated booking (post-save) for formatting

- Arrange: `Booking.findById` returns a populated object with extra fields
- Act: call `createBooking`
- Assert: `formatBookingResponse` is called with the populated object (not the raw saved one)

3. HP-3: Correct payload to Booking constructor and `.save()` invoked once

- Arrange: default no-conflict
- Act: call `createBooking`
- Assert: `Booking` constructed with baseData + `status: PENDING`, and instance `.save()` called exactly once

4. HP-4: Supports creating booking at midnight boundary

- Arrange: `bookingDate = new Date('2024-06-01T00:00:00Z')`
- Act: call `createBooking`
- Assert: succeeds, `invalidateWeeklyCache` arguments match midnight date

5. HP-5: Supports long duration when there are no existing bookings

- Arrange: `duration = 12 * 60` minutes, no conflicts
- Act: call `createBooking`
- Assert: returns formatted response; no additional assumptions

## Edge cases (3 tests)

1. EDGE-1: Zero-minute duration is accepted (no overlap)

- Arrange: `duration = 0`; no conflicts
- Act/Assert: booking created successfully; duration preserved in formatted result

2. EDGE-2: Leap day booking handled correctly

- Arrange: `bookingDate = new Date('2024-02-29T08:00:00Z')`
- Act/Assert: booking created successfully; date preserved

3. EDGE-3: Extra/unrelated fields in input don’t break creation

- Arrange: include `notes: 'please be on time'` and `extraMeta: { a: 1 }` in input
- Act/Assert: booking created; core output fields intact

## Error scenarios (3 tests)

1. ERR-1: Throws on time conflict (overlap)

- Arrange: make `checkBookingConflict` return `{ hasConflict: true, conflictingBooking: { startTime, endTime, date } }`
  - If not exported, configure `Booking.find` used by the checker to produce an overlapping booking (e.g., existing 10:00-11:00, new 10:30-11:30)
- Act/Assert: `createBooking` rejects with message matching `Booking conflict detected`
- Extra: ensure `new Booking()` not called when conflict occurs

2. ERR-2: Throws when customer not found after save

- Arrange: no conflict; `model('User').findById(...).exec()` resolves `null`
- Act/Assert: `createBooking` rejects with `Customer not found`

3. ERR-3: Throws when populated booking cannot be retrieved after save

- Arrange: no conflict; `Booking.findById(...).populate(...).exec()` resolves `null`
- Act/Assert: `createBooking` rejects with `Failed to retrieve created booking`

## Integration with cart state (adapted: cache/state interaction) (1 test)

1. INT-1: Integrates with weekly cache invalidation

- Arrange: no conflict; normal flow
- Act: call `createBooking`
- Assert: `invalidateWeeklyCache` called exactly once with `(muaId, bookingDate)` to reflect scheduling state change

---

## Helper/mocking notes

- Chainable query mock:
  ```ts
  const makeQuery = (result: any) => ({
    populate: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });
  ```
- Booking mock factory should support constructor and statics:
  ```ts
  const BookingMockFactory = () => {
    const Booking: any = jest.fn(function Booking(this: any, data: any) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue({ _id: 'saved-id', ...data });
    });
    Booking.find = jest.fn().mockReturnValue(makeQuery([]));
    Booking.findById = jest.fn().mockReturnValue(makeQuery(null));
    Booking.findByIdAndUpdate = jest.fn().mockReturnValue(makeQuery(null));
    Booking.countDocuments = jest.fn().mockResolvedValue(0);
    return Booking;
  };
  ```
- Mock `mongoose.model('User')` to return a user doc with `.save()` that can be spied on
- Keep `dayjs` unmocked
- Prefer realistic timestamps that clearly overlap or clearly do not

## Acceptance criteria

- All 12 test methods implemented matching titles and assertions above
- Tests run with Jest and pass under mocks
- Coverage for `createBooking` branches: conflict, success, customer missing, post-save retrieval missing, cache invalidation and formatter calls
- No actual database or cache operations executed during tests
