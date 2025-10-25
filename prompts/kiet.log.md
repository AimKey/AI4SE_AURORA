# Kiet

## Method can test

- methods:
  createBooking, getBookingById, updateBooking

function createBooking(bookingData: CreateBookingDTO): Promise<BookingResponseDTO>
function getBookingById(bookingId: string): Promise<BookingResponseDTO | null>
function updateBooking(
bookingId: string,
updateData: UpdateBookingDTO
): Promise<BookingResponseDTO | null>

- coverage guideline

1. run `npx jest --coverage` or `npx jest --coverage`
   sau khi chạy, sẽ có thư mục như sau:
   coverage/
   ├── lcov-report/
   │ ├── index.html
   │ ├── ...
   └── coverage-final.json

2. mở file trên browser: coverage/lcov-report/index.html

## Phan tich code

- Input Prompt:
  "Analyze this Booking Service class and identify all functions related to createBooking, getBooking, and updateBooking that need unit testing:

[PASTE YOUR CODE HERE]

For each function, identify:

1. Main functionality
2. Input parameters and types
3. Expected return values
4. Potential edge cases
5. Dependencies that need mocking"

- Input references:
  booking.service.ts

createBooking
Main functionality: Create a new booking after ensuring no time conflict, persist booking, update customer phone, invalidate weekly slot cache, and return formatted booking response.
Input: bookingData: CreateBookingDTO
Return: Promise<BookingResponseDTO> or throws on error/conflict
Edge cases:
Time conflict with existing bookings (overlap)
Customer not found
Populate fails to retrieve created booking
Redis/cache invalidation errors should not break main flow if caught (but here they’re awaited and wrapped)
Dependencies to mock:
Booking model: constructor, save, find, findById
mongoose.model('User'): findById().exec(), user.save()
invalidateWeeklyCache from ./slot.service
formatBookingResponse from ../utils/booking.formatter
dayjs for time math (don’t mock, rely on real)

getBookingById
Main functionality: Fetch a booking by ID and format the response
Input: bookingId: string
Return: Promise<BookingResponseDTO | null>
Edge cases:
Booking not found -> null
populate needed fields
Dependencies to mock:
Booking.findById().populate().exec()
formatBookingResponse

getAllBookings
Main functionality: Fetch paginated list of bookings with optional status filter, format responses
Input: page?: number, pageSize?: number, status?: string
Return: Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }>
Edge cases:
Empty list
Status filter applied or omitted
Pagination correctness (skip, limit)
Dependencies to mock:
Booking.find().populate().skip().limit().sort().exec()
Booking.countDocuments()
formatBookingResponse

getBookingsByCustomer
Main functionality: Fetch paginated bookings for a customer ID and format
Input: customerId: string, page?: number, pageSize?: number
Return: Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }>
Edge cases:
No bookings
Pagination
Dependencies to mock:
Booking.find().populate().skip().limit().sort().exec()
Booking.countDocuments()
formatBookingResponse

getBookingsByMUA
Main functionality: Fetch paginated bookings for a MUA ID and format
Input: muaId: string, page?: number, pageSize?: number
Return: Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }>
Edge cases:
No bookings
Pagination
Dependencies to mock:
Booking.find().populate().skip().limit().sort().exec()
Booking.countDocuments()
formatBookingResponse

getBookingsByDate
Main functionality: Fetch bookings within a day (optionally filtered by MUA) and format
Input: date: string, muaId?: string
Return: Promise<BookingResponseDTO[]>
Edge cases:
No bookings
With and without muaId filter
Date parsing correctness and sort order
Dependencies to mock:
Booking.find().populate().sort().exec()
formatBookingResponse

updateBooking
Main functionality: Update a booking; if time/mua/date changes, check conflicts first; return formatted response
Input: bookingId: string, updateData: UpdateBookingDTO
Return: Promise<BookingResponseDTO | null>
Edge cases:
Booking not found -> null
Conflict after updating bookingDate/duration/muaId -> throws
Successful update returns formatted response
Dependencies to mock:
Booking.findById().exec()
Booking.find() (for conflict check)
Booking.findByIdAndUpdate().populate().exec()
formatBookingResponse

## Prompt 2: Generate Test Cases outline in testcase.md

- Input Prompt
  "Generate comprehensive unit test cases to [updateBooking].testcase.md in folder testcases for [Booking.Service.ts] 's [updateBooking]() function:

Include:

- Happy path scenarios - 3 test method
- Edge cases (boundary values) - 3 test method
- Error scenarios - 3 test method
- Integration with cart state - 1 test method

- Input references:
  booking.service.ts
  booking_availability.test.ts

1. class need test
2. folder testcases

## Prompt 3: Generate Jest Test Code

- Input Prompt
  "Create Jest unit tests in file [booking_availability.test].ts for [BookingService]'s [getAvailableServicesOfMuaByDay]() function with test cases in [getAvailableServicesOfMuaByDay].testcase.md:

Requirements:

- Use Jest framework
- Include setup/teardown
- Use proper assertions (toEqual, toThrow)
- Add descriptive test names
- Mock any external dependencies

How to structure a test file

1. Imports – Import only what you need (target module, related services/models).
2. Mock helper – Create a `createMockRes()` to fake `res.status` and `res.json`.
3. Describe block – Group tests by one method or module.
4. Test cases – Each `test()` follows the clear structure:
   - Arrange – Prepare mock data
   - Act – Call the function under test
   - Assert – Verify expected results
5. Test order – Write in order: Happy → Edge → Error → Integration.
6. Formatting rules:
   - Use clear, descriptive test names
   - Keep each test ≤ 30 lines, separate tests with one blank line
   - Reset mocks using `afterEach()`"

- Input references:
  booking.service.ts
  createBooking.testcase.md
- Output test file:
  booking_availability.test.ts

1. class need test
2. file testcase.md
3. file contain test methods

## Prompt 4: Debug Failing Test

Đôi khi chat sẽ generate các test sau không tương ứng với cái test trước. (Thiếu TC, không đúng tiền tố)
"Make sure the new test cases has the same characteritics as the previous one, such as:

1. Imports – Import only what you need (target module, related services/models).
2. Mock helper – Create a `createMockRes()` to fake `res.status` and `res.json`.
3. Describe block – Group tests by one method or module.
4. Test cases – Each `test()` follows the clear structure:
   - Arrange – Prepare mock data
   - Act – Call the function under test
   - Assert – Verify expected results
5. Test order – Write in order: Happy → Edge → Error → Integration.
6. Formatting rules:
   - Use clear, descriptive test names
   - Keep each test ≤ 30 lines, separate tests with one blank line
   - Reset mocks using `afterEach()`"
7. Has prefix for each test case
8. Each method should has

- Happy path scenarios - 5 test method
- Edge cases (boundary values) - 3 test method
- Error scenarios - 3 test method
- Integration with cart state - 1 test method

"Help me fix this failing unit test:

ERROR: TypeError: Cannot read property 'id' of undefined
TEST CODE: [paste test code]
SOURCE CODE: [paste function code]

What's wrong and how to fix it?"

"Help me fix this failing unit test:

ERROR: TypeError: Cannot read property 'id' of undefined
TEST CODE: [paste test code]
SOURCE CODE: [paste function code]

What's wrong and how to fix it?"

## Prompt 5: Generate Mocks

"Create Jest mock objects for these dependencies in Shopping Cart:

- ProductService.getProduct(id)
- UserService.getUserById(id)
- DiscountService.validateCode(code)

Include realistic test data and proper mock setup/teardown."
