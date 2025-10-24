# cancelBooking() — Test cases

This file documents unit test cases for:

```ts
export async function cancelBooking(bookingId: string): Promise<BookingResponseDTO | null>
```

Behavior summary (from implementation):
- Calls `Booking.findByIdAndUpdate(bookingId, { status: CANCELLED, updatedAt }, { new: true, runValidators: true })` and then `.populate('customerId serviceId').exec()`.
- If `cancelledBooking` is falsy -> returns `null`.
- On success returns `formatBookingResponse(cancelledBooking)`.
- On unexpected errors throws `Error('Failed to cancel booking: ...')`.

----

Test structure for each case:
- Title — short test name
- Purpose — what to verify
- Mocks / preconditions — how to stub `Booking.findByIdAndUpdate` and `formatBookingResponse` (if desired)
- Input — bookingId
- Expected output / assertions
- Steps — arrange / act / assert

----

## Happy path (5 tests)

HP-1: successfully cancels an existing booking and returns formatted DTO
- Purpose: verify normal path
- Mocks: `Booking.findByIdAndUpdate(...).populate().exec()` -> returns a booking object with `_id`, `status = CANCELLED`, `customerId`/`serviceId` populated
- Input: bookingId = 'b-cancel-1'
- Expected: returned DTO has `_id` 'b-cancel-1' and `status` equals `BOOKING_STATUS.CANCELLED`

HP-2: cancelled booking with missing optional fields still returns DTO
- Purpose: ensure `formatBookingResponse` tolerates missing fields
- Mocks: `Booking.findByIdAndUpdate` returns object with minimal props (only _id and status)
- Expected: function returns DTO with defaulted values (empty strings or zeros)

HP-3: cancel on already CANCELLED booking returns formatted DTO (idempotent)
- Purpose: calling cancel on a booking already CANCELLED should still return the formatted booking (DB returns the same doc)
- Mocks: `findByIdAndUpdate` returns a booking whose status is CANCELLED
- Expected: formatted DTO returned, no error

HP-4: updatedAt is set by DB and reflected indirectly
- Purpose: ensure function returns something even when DB sets timestamps
- Mocks: `findByIdAndUpdate` returns object with updatedAt set to a known Date
- Expected: returned DTO contains `updatedAt` (via formatBookingResponse) matching expectation

HP-5: populate returns populated customer/service and DTO contains their info
- Purpose: ensure populate result flows into DTO
- Mocks: `findByIdAndUpdate` returns booking with `customerId = { _id: 'c1', fullName: 'C' }` and `serviceId = { _id: 's1', name: 'S' }`
- Expected: `customerName` and `serviceName` in returned DTO

----

## Edge cases (3 tests)

EC-1: bookingId format is valid but DB returns null -> function returns null
- Purpose: handle not-found gracefully
- Mocks: `findByIdAndUpdate(...).exec()` -> null
- Expected: function returns `null` (not throwing)

EC-2: very long bookingId string (still valid) -> handled normally
- Purpose: ensure function doesn't break on long IDs (boundary input)
- Mocks: `findByIdAndUpdate` returns booking
- Expected: success

EC-3: booking has unusual status value (unknown string) but DB updates to CANCELLED and return DTO
- Purpose: ensure status normalization happens by DB update and function returns DTO
- Mocks: original booking had weird status; `findByIdAndUpdate` returns booking with status CANCELLED
- Expected: DTO shows CANCELLED

----

## Error scenarios (3 tests)

ERR-1: DB throws error during findByIdAndUpdate -> function throws Error with descriptive message
- Purpose: surface backend errors
- Mocks: `findByIdAndUpdate` throws/rejects with Error('DB down')
- Expected: `await expect(cancelBooking(id)).rejects.toThrow('Failed to cancel booking:')`

ERR-2: populate chain throws (e.g., populate().exec() rejects) -> function throws
- Purpose: exercise error propagation from populate/exec
- Mocks: `findByIdAndUpdate().populate().exec()` rejects
- Expected: function throws Error with message containing `Failed to cancel booking:`

ERR-3: formatBookingResponse itself throws (rare) -> function should propagate the error
- Purpose: ensure formatting errors bubble up
- Mocks: `findByIdAndUpdate` returns booking; `formatBookingResponse` stubbed to throw
- Expected: function throws the formatting error (caught by caller)

----

## Integration-style test (1 test)

INT-1: full flow with realistic booking object (populated customer/service) — verify return shape
- Purpose: simulate near-production object with nested customer/service and timestamps
- Mocks: `findByIdAndUpdate(...).populate(...).exec()` returns full booking with nested fields and dates
- Expected: returned object includes formatted fields (customerName, serviceName, formatted dates)

----

Notes for test authors
- Mock `Booking.findByIdAndUpdate` to return an object exposing `.populate()` which returns an object exposing `.exec()` that resolves to the wanted doc, e.g.:

```ts
jest.spyOn(Booking, 'findByIdAndUpdate').mockReturnValue({ populate: () => ({ exec: () => Promise.resolve(doc) }) } as any);
```

- For DB errors, mock `.exec()` to reject: `exec: () => Promise.reject(new Error('DB down'))`.
- Use `afterEach(() => jest.restoreAllMocks())`.
- When asserting thrown errors, prefer `await expect(fn()).rejects.toThrow('Failed to cancel booking:')`.

If you'd like, I can generate the Jest test file `tests/cancelBooking.test.ts` implementing these cases and run the tests. Say the word and I'll create and execute them.
