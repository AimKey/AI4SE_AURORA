# Huyen
##  Method can test
- methods:
acceptBooking, rejectBooking, markCompleted, cancel

updateBookingStatus, handleBalanceConfirmBooking(transaction service)
handleRefundBookingBeforeConfirm(transaction service) 
markBookingCompleted
cancelBooking

- command note:
npm test -- tests/booking_status_flow.test.ts -t "ERR-3: formatBookingResponse throws -> error bubbles up"

- coverage guideline
1. run ``npx jest --coverage`` or ```npx jest --coverage```
sau khi chạy, sẽ có thư mục như sau:
coverage/
├── lcov-report/
│   ├── index.html
│   ├── ...
└── coverage-final.json

2. mở file trên browser: coverage/lcov-report/index.html


## Phan tich code 

- Input Prompt:
"Analyze this Shopping Cart class and identify all functions that need unit testing:

[PASTE YOUR CODE HERE]

For each function, identify:
1. Main functionality
2. Input parameters and types
3. Expected return values
4. Potential edge cases
5. Dependencies that need mocking"

- Input references:
1. class need test


## Prompt 2: Generate Test Cases
- Input Prompt
"Generate comprehensive unit test cases to [method_name].testcase.md in folder testcases for [class_name] [method_name]() function:

[PASTE YOUR CODE METHOD HERE]

Include:
- Happy path scenarios - 5 test method
- Edge cases (boundary values) - 3 test method
- Error scenarios - 3 test method
- Integration with cart state - 1 test method

- Input references:
1. class need test
2. folder testcases

## Prompt 3: Generate Jest Test Code
- Input Prompt
"Create Jest unit tests in file [test_file_name].ts for [class_name]'s [method_name]() function with test cases in [method_name].testcase.md:

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
   * Arrange – Prepare mock data
   * Act – Call the function under test
   * Assert – Verify expected results
5. Test order – Write in order: Happy → Edge → Error → Integration.
6. Formatting rules:
   * Use clear, descriptive test names
   * Keep each test ≤ 30 lines, separate tests with one blank line
   * Reset mocks using `afterEach()`"

- Input references:
1. class need test
2. file testcase.md
3. file contain test methods

## Prompt 4: Debug Failing Test
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