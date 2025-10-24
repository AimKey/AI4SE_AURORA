# markBookingCompleted() — Test cases

This file documents unit test cases for:

```ts
export async function markBookingCompleted(bookingId: string, muaIdFromReq: string)
```

Behavior summary (from implementation):
- Validates `bookingId` is a valid ObjectId; if not, throws an error with status 404 (`booking_not_found`).
- Validates `muaIdFromReq` is present and a valid ObjectId; if not, throws 401 `unauthorized`.
- Looks up booking via `Booking.findById(bookingId).exec()`; if not found -> throw 404 `booking_not_found`.
- Ownership: compares `booking.muaId?.toString()` with `muaIdFromReq`; if mismatch -> throw 403 `not_owner`.
- Status: requires booking.status === `BOOKING_STATUS_CONST.CONFIRMED`; otherwise throw 409 `invalid_status`.
- Time check: calls `hasBookingEnded({ bookingDate, duration })`; if false -> throw 422 `too_early`.
- Updates booking via `Booking.findByIdAndUpdate(..., { status: COMPLETED, completedAt, updatedAt }, { new: true })` and expects a returned `updated` doc; if `updated` falsy -> throw 500 `internal_error`.
- Returns object {_id, status, completedAt} on success.

----

Test structure for each case:
- Title — short test name
- Purpose — what's being verified
- Mocks / preconditions — how to mock `mongoose.Types.ObjectId.isValid`, `Booking.findById`, `hasBookingEnded`, `Booking.findByIdAndUpdate` etc.
- Input — bookingId, muaIdFromReq
- Expected output / assertions
- Steps — arrange / act / assert

----

## Happy path (5 tests)

HP-1: completes a confirmed booking whose end time is in the past
- Purpose: Normal end-to-end path returns completed payload.
- Mocks:
  - `mongoose.Types.ObjectId.isValid` -> true for bookingId and muaId
  - `Booking.findById(bookingId).exec()` -> returns booking object with muaId matching muaIdFromReq, status CONFIRMED, bookingDate in past, duration numeric
  - `hasBookingEnded(...)` -> true
  - `Booking.findByIdAndUpdate(...).exec()` -> returns updated booking with completedAt
- Input: valid bookingId, muaIdFromReq
- Expected: returns {_id, status: COMPLETED, completedAt} with status string equals COMPLETED

HP-2: uses booking where booking.muaId is an ObjectId object (has toString function)
- Purpose: Ensure owner check works when `muaId` is an ObjectId-like object
- Mocks: same as HP-1 but booking.muaId = { toString: () => muaIdFromReq }
- Expected: completion succeeds

HP-3: updated document returned is used to build response (timestamps preserved)
- Purpose: Ensure returned `completedAt` is the same as in DB return
- Mocks: set `Booking.findByIdAndUpdate` to return an `updated` object with `completedAt` set to known Date
- Expected: returned DTO uses that exact timestamp

HP-4: long duration booking still marks completed when ended
- Purpose: Ensure `hasBookingEnded` check honors long durations
- Mocks: booking.duration = 240, bookingDate in distant past, `hasBookingEnded` true
- Expected: success

HP-5: multiple fast consecutive calls with same bookingId return same completed result (idempotent-like)
- Purpose: Simulate repeated calls; if `findByIdAndUpdate` returns same updated doc each time, function returns consistent result.
- Mocks: same as HP-1, call function twice
- Expected: both calls return same _id and status

----

## Edge cases (3 tests)

EC-1: bookingId is valid format but Booking.findById returns null -> 404 error
- Purpose: Ensure function throws booking_not_found when booking missing
- Mocks: isValid true, `Booking.findById` -> null
- Expected: throw error object with status 404 and code "booking_not_found"

EC-2: muaIdFromReq is present but not matching booking owner (ownerMuaId mismatches) -> 403 not_owner
- Purpose: Confirm ownership check
- Mocks: isValid true, Booking.findById returns booking with muaId 'ownerX', muaIdFromReq = 'otherY'
- Expected: throw with status 403 and code "not_owner"

EC-3: booking status is not CONFIRMED (e.g., PENDING) -> 409 invalid_status
- Purpose: Ensure only CONFIRMED bookings can be completed
- Mocks: booking.status = BOOKING_STATUS_CONST.PENDING
- Expected: throw 409 invalid_status

----

## Error scenarios (3 tests)

ERR-1: bookingId invalid (mongoose.Types.ObjectId.isValid returns false) -> throw 404 booking_not_found
- Purpose: Validate immediate input check
- Mocks: isValid returns false for bookingId
- Expected: thrown error with status 404 and code "booking_not_found"

ERR-2: muaIdFromReq missing or invalid -> throw 401 unauthorized
- Purpose: Validate muaId presence & format
- Mocks: bookingId valid, muaIdFromReq = '' or invalid format (isValid false)
- Expected: thrown error with status 401 and code "unauthorized"

ERR-3: Booking.findByIdAndUpdate returns null (DB failed to update) -> throw 500 internal_error
- Purpose: Ensure update failure is surfaced
- Mocks: Booking.findById returns valid booking; `hasBookingEnded` true; Booking.findByIdAndUpdate returns null
- Expected: thrown error with status 500 and code "internal_error"

----

## Integration-style test (1 test)

INT-1: full flow with real-ish objects (ObjectId-like and date) to simulate realistic values
- Purpose: Simulate near-real scenario where booking is stored with ObjectId-like `muaId` (object with toString), bookingDate is a real Date in the past, and DB update returns updated object; verify returned payload shape and values.
- Mocks:
  - `mongoose.Types.ObjectId.isValid` returns true
  - `Booking.findById(...).exec()` returns booking with `muaId = { toString: () => 'realMuaId' }` and `bookingDate = new Date('2025-01-01T09:00:00Z')` and `status = CONFIRMED` and `duration = 60`
  - `hasBookingEnded(...)` returns true (optionally compute from bookingDate + duration)
  - `Booking.findByIdAndUpdate(...).exec()` returns updated booking with `completedAt` set to Date
- Expected assertions:
  - Function returns object with `_id` string same as updated._id
  - `status` equals `BOOKING_STATUS_CONST.COMPLETED`
  - `completedAt` equals value returned from DB

----

Notes for test authors
- Mock `mongoose.Types.ObjectId.isValid` carefully — restore original after tests.
- Use spies on `Booking.findById`, `Booking.findByIdAndUpdate` to control returned documents.
- For thrown error assertions, check thrown object shape: e.g., `await expect(fn()).rejects.toMatchObject({ status: 404, code: 'booking_not_found' })`.
- Add `afterEach(() => { jest.restoreAllMocks(); })` in test file.

If you'd like, I can generate the Jest test file `tests/markBookingCompleted.test.ts` implementing these tests and run them locally. Say the word and I'll create it and run the suite.
