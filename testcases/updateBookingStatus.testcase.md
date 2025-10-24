# updateBookingStatus() — Test cases

This file describes comprehensive unit test cases for the booking service function:

```ts
export async function updateBookingStatus(
    bookingId: string,
    status: string
): Promise<BookingResponseDTO | null>
```

Summary of behavior to test (from implementation):
- Calls `Booking.findByIdAndUpdate(bookingId, { status, updatedAt })` and populates `customerId` and `serviceId`.
- If no booking is returned => returns `null`.
- On success, attempts to call `invalidateWeeklyCache(muaId, bookingDate)` if `muaId` and `bookingDate` exist.
- Looks up `Transaction` by `bookingId`; if exists and new status === `BOOKING_STATUS.CONFIRMED`, sets `transaction.status = TRANSACTION_STATUS.CAPTURED`, saves it, then increments `muaWallet.balance` by `transaction.amount` and saves wallet (if wallet found).
- Any errors inside the inner try (invalidate cache / transaction / wallet) are caught and only warn; they don't fail the function.
- Outer errors (e.g., DB error during `findByIdAndUpdate`) throw an Error with message `Failed to update booking status: ...`.
- Finally returns `formatBookingResponse(updatedBooking)`.

----

Test structure for each case:
- Title — short descriptive test name
- Purpose — what we verify
- Preconditions / mocks — mocks and their return values
- Input — (bookingId, status)
- Expected output / assertions — what to assert (return value, side-effect calls)
- Steps — arrange / act / assert (brief)

Constants & helpers to mock (names used in implementation):
- `Booking.findByIdAndUpdate` (chain `.populate().exec()`)
- `invalidateWeeklyCache(muaId, bookingDate)`
- `mongoose.model('Transaction').findOne` (returns transaction or null)
- `Wallet.findOne` (from `mongoose.model('Wallet')` or via `mongoose.model('Wallet')`) and `muaWallet.save()`
- `transaction.save()`
- `formatBookingResponse(updatedBooking)` — if you prefer to spy, otherwise inspect returned DTO fields

Notes on mocking pattern:
- Use `jest.spyOn(Booking, 'findByIdAndUpdate')` returning an object with `.populate` that returns an object with `.exec()` returning the desired booking document.
- For `mongoose.model('Transaction')` you can mock the model by creating a fake object with `findOne` method or `jest.spyOn(mongoose, 'model')` to return custom mocks for 'Transaction' and 'Wallet'.

----

## Happy path (5 tests)

HP-1: update to CANCELLED returns formatted booking
- Purpose: Ensure function returns formatted DTO when booking updated successfully and no transaction exists.
- Mocks:
  - `Booking.findByIdAndUpdate(...).populate(...).exec()` -> returns `updatedBooking` object (with `_id`, `muaId`, `bookingDate`, `customerId`, `serviceId`, `duration`, `status`)
  - `mongoose.model('Transaction').findOne` -> returns `null`
  - `invalidateWeeklyCache` -> resolved
  - `formatBookingResponse` -> use real function or allow default formatting
- Input: (bookingId='b1', status='CANCELLED')
- Expected:
  - Return is BookingResponseDTO matching `updatedBooking` fields
  - `invalidateWeeklyCache` called with `muaId` and `bookingDate`
  - Transaction lookup called with `{ bookingId: 'b1' }`
- Steps: arrange mocks -> call -> assert return and calls

HP-2: update to CONFIRMED triggers transaction capture and wallet balance update
- Purpose: When status is `CONFIRMED` and a Transaction exists, transaction saved and wallet incremented.
- Mocks:
  - `Booking.findByIdAndUpdate(...)` -> returns `updatedBooking` (include `muaId` and `bookingDate`)
  - `mongoose.model('Transaction').findOne` -> returns `transaction` object mock: { status: 'PENDING', amount: 100, save: jest.fn().mockResolvedValue(...) }
  - `mongoose.model('Wallet').findOne` -> returns `muaWallet` mock: { balance: 50, save: jest.fn().mockResolvedValue(...) }
  - `invalidateWeeklyCache` -> resolved
- Input: (bookingId='b2', status=BOOKING_STATUS.CONFIRMED)
- Expected:
  - transaction.status updated to TRANSACTION_STATUS.CAPTURED and `transaction.save()` called
  - `muaWallet.balance` becomes 150 and `muaWallet.save()` called
  - Function returns formatted DTO
- Steps: arrange -> call -> assert transaction.save called, wallet.save called and wallet.balance incremented, return DTO

HP-3: booking found but has no muaId or bookingDate: still returns DTO and skips cache invalidation
- Purpose: Verify code gracefully skips invalidateWeeklyCache when `muaId` or `bookingDate` missing.
- Mocks:
  - `Booking.findByIdAndUpdate()` -> returns `updatedBooking` with `muaId = null` or missing, `bookingDate = undefined`
  - Transaction lookup -> null
- Input: (bookingId='b3', status='PENDING')
- Expected:
  - `invalidateWeeklyCache` not called
  - returns DTO

HP-4: booking updated and transaction exists but status != CONFIRMED -> transaction untouched
- Purpose: If status is something other than CONFIRMED, transaction should not be marked captured and wallet not updated.
- Mocks:
  - `Booking.findByIdAndUpdate()` -> returns `updatedBooking` with muaId & bookingDate
  - `Transaction.findOne` -> returns transaction mock
  - `Wallet.findOne` -> not called
- Input: (bookingId='b4', status='CANCELLED')
- Expected:
  - transaction.save not called (or status unchanged)
  - wallet.findOne not called
  - returns DTO

HP-5: booking exists and invalidation function throws but update still returns DTO
- Purpose: Inner try's exceptions (invalidate/transaction/wallet) are swallowed; function still returns DTO.
- Mocks:
  - `Booking.findByIdAndUpdate()` -> returns `updatedBooking`
  - `invalidateWeeklyCache` -> throws error
  - `Transaction.findOne` -> throws error (or wallet.save throws) — any exception inside inner try
- Input: (bookingId='b5', status='PENDING')
- Expected:
  - No exception thrown from `updateBookingStatus` (outer try unaffected)
  - Return DTO
  - Warning logged (optional assert on console.warn via spy)

----

## Edge cases (3 tests)

EC-1: bookingId is empty string (invalid id) -> Booking.findByIdAndUpdate throws / validation error
- Purpose: Ensure invalid input that causes DB validation error results in an outer error being thrown.
- Mocks:
  - `Booking.findByIdAndUpdate` -> throws an error (e.g., `CastError` or custom)
- Input: (bookingId='', status='CONFIRMED')
- Expected:
  - Function throws Error with message containing `Failed to update booking status:`

EC-2: Transaction exists but wallet not found -> transaction.status updated, wallet unchanged
- Purpose: Confirm branch where transaction exists, but `Wallet.findOne` returns `null` is handled (no wallet update) and function still returns DTO.
- Mocks:
  - `Booking.findByIdAndUpdate` -> updatedBooking
  - `Transaction.findOne` -> transaction mock with save
  - `Wallet.findOne` -> null
- Input: (bookingId='b6', status=BOOKING_STATUS.CONFIRMED)
- Expected:
  - `transaction.save()` called and transaction.status set to CAPTURED
  - `Wallet.findOne` called and returned null
  - No attempt to call `muaWallet.save()`
  - returns DTO

EC-3: bookingDate is present but not a valid Date type (e.g. string) — ensure invalidateWeeklyCache tolerates or is skipped
- Purpose: bookingDate may sometimes be stored as a string; ensure function attempts to call invalidate with the given value, or if invalid, inner try swallows exceptions.
- Mocks:
  - `Booking.findByIdAndUpdate` -> updatedBooking with `bookingDate = 'invalid-date-string'`
  - `invalidateWeeklyCache` -> either resolves or throws; test both behaviors conceptually; here assert that if `invalidateWeeklyCache` throws, function still returns DTO.
- Input: (bookingId='b7', status='PENDING')
- Expected:
  - If `invalidateWeeklyCache` resolves: called with muaId and that bookingDate
  - If it throws: function still returns DTO

----

## Error scenarios (3 tests)

ERR-1: DB error during Booking.findByIdAndUpdate -> outer error thrown
- Purpose: Ensure serious DB failure results in thrown Error bubbling out with a helpful message.
- Mocks:
  - `Booking.findByIdAndUpdate` -> rejects with Error('DB down')
- Input: (bookingId='e1', status='CONFIRMED')
- Expected:
  - Function throws Error and message contains `Failed to update booking status:` and original error message

ERR-2: Transaction.save throws error (but inside inner try) -> function swallows error and returns DTO
- Purpose: Ensure exceptions during transaction save do not cause function to throw.
- Mocks:
  - `Booking.findByIdAndUpdate` -> updatedBooking
  - `Transaction.findOne` -> transaction mock whose `save()` rejects
  - `Wallet.findOne` -> muaWallet mock (optionally)
- Input: (bookingId='e2', status=BOOKING_STATUS.CONFIRMED)
- Expected:
  - No exception thrown from `updateBookingStatus`
  - `console.warn` called (spy)
  - Return DTO

ERR-3: Wallet.save throws error -> swallowed and function returns DTO
- Purpose: Ensure `muaWallet.save()` rejection is caught by inner try and does not propagate.
- Mocks:
  - `Booking.findByIdAndUpdate` -> updatedBooking
  - `Transaction.findOne` -> transaction mock that saves fine
  - `Wallet.findOne` -> muaWallet mock whose `save()` rejects
- Input: (bookingId='e3', status=BOOKING_STATUS.CONFIRMED)
- Expected:
  - Function returns DTO
  - `transaction.save()` called, `muaWallet.save()` attempted and rejected internally (log warn)

----

## Integration test (1 test)

INT-1: End-to-end mock flow — booking updated to CONFIRMED, transaction captured, wallet persisted, cache invalidated
- Purpose: Simulate the full happy path where all dependencies succeed and verify the sequence of side effects and final DTO.
- Preconditions / mocks:
  - `Booking.findByIdAndUpdate(...).populate(...).exec()` -> `updatedBooking` with `_id='i1'`, `muaId='m1'`, `bookingDate = new Date('2025-01-15T10:00:00Z')`, `customerId`, `serviceId`, `duration`
  - `Transaction.findOne({ bookingId: 'i1' })` -> { status: 'PENDING', amount: 200, save: jest.fn().mockResolvedValue(...) }
  - `Wallet.findOne({ muaId: updatedBooking.muaId })` -> { balance: 300, save: jest.fn().mockImplementation(function(){ this.balance += 0; return Promise.resolve(this); }) }
  - `invalidateWeeklyCache` -> jest.fn().mockResolvedValue()
  - Optionally spy on `formatBookingResponse`
- Input: (bookingId='i1', status=BOOKING_STATUS.CONFIRMED)
- Expected assertions:
  - `Booking.findByIdAndUpdate` called with correct args
  - `invalidateWeeklyCache` called once with muaId 'm1' and bookingDate
  - `Transaction.findOne` called and `transaction.save()` called
  - `Wallet.findOne` called and `muaWallet.balance` increased by 200 and `muaWallet.save()` called
  - The returned DTO fields reflect the updated booking data

----

## Additional implementation notes for test authors
- When mocking `Booking.findByIdAndUpdate`, the real code calls `.populate('customerId serviceId').exec()` — ensure your mock returns an object where `.populate()` returns an object with `.exec()`.
- To assert that `invalidateWeeklyCache` was called with the right types, convert `bookingDate` to a Date in your test input and expect the arguments accordingly.
- Use `jest.spyOn(console, 'warn')` to assert the function logs warnings when inner try fails.
- Use `jest.restoreAllMocks()` / `afterEach(() => jest.resetAllMocks())` in test files.

----

If you want, I can next generate the actual Jest test file `tests/updateBookingStatus.test.ts` implementing these cases with proper mocks and test runner setup. Tell me to proceed and I will create the test file and run the tests locally (or prepare the run instructions).
