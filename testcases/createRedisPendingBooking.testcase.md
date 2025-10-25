# Test Cases for `createRedisPendingBooking` Function

## Function Overview
- **Function Name**: `createRedisPendingBooking`
- **Purpose**: Tạo booking tạm thời trong Redis với TTL 30 phút (1800s) để chờ thanh toán
- **Input**: `bookingData: CreateBookingDTO`
- **Output**: `Promise<null | PendingBookingResponseDTO>`
- **Key Operations**:
  - Kiểm tra conflict với bookings hiện có (checkBookingConflict)
  - Tạo Booking object với status PENDING
  - Sinh orderCode duy nhất
  - Lưu vào Redis JSON với TTL 1800s
  - Format response với customerPhone và orderCode

---

## Test Case Categories

### **HAPPY PATH (5 test cases)**

#### **HP-1: Successfully create pending booking with valid data**
- **Description**: Tạo pending booking thành công với đầy đủ thông tin hợp lệ
- **Input**:
  ```typescript
  {
    customerId: new ObjectId(),
    muaId: new ObjectId(),
    serviceId: new ObjectId(),
    bookingDate: new Date('2025-11-01T09:00:00Z'),
    duration: 120,
    customerPhone: '0912345678',
    location: '123 Test Street',
    totalPrice: 500000
  }
  ```
- **Expected Output**: 
  - PendingBookingResponseDTO với status "pending"
  - orderCode được sinh ra
  - customerPhone được include
- **Mocks**:
  - `checkBookingConflict` returns `{ hasConflict: false }`
  - `generateOrderCode` returns `12345`
  - `redisClient.json.set` resolves successfully
  - `redisClient.expire` resolves successfully

#### **HP-2: Create pending booking with minimum required fields**
- **Description**: Tạo booking chỉ với các trường bắt buộc
- **Input**:
  ```typescript
  {
    customerId: new ObjectId(),
    muaId: new ObjectId(),
    serviceId: new ObjectId(),
    bookingDate: new Date(),
    duration: 60,
    customerPhone: '0987654321'
  }
  ```
- **Expected Output**: PendingBookingResponseDTO với các giá trị mặc định cho optional fields
- **Mocks**: Same as HP-1

#### **HP-3: Create pending booking with early morning time slot**
- **Description**: Tạo booking vào khung giờ sáng sớm (6:00 AM)
- **Input**: bookingDate = `new Date('2025-11-01T06:00:00Z')`
- **Expected Output**: Pending booking được tạo thành công
- **Mocks**: checkBookingConflict returns no conflict

#### **HP-4: Create pending booking with late evening time slot**
- **Description**: Tạo booking vào khung giờ tối muộn (22:00 PM)
- **Input**: bookingDate = `new Date('2025-11-01T22:00:00Z')`
- **Expected Output**: Pending booking được tạo thành công
- **Mocks**: checkBookingConflict returns no conflict

#### **HP-5: Verify Redis TTL is set correctly (1800 seconds)**
- **Description**: Xác nhận Redis key có TTL đúng 30 phút
- **Input**: Valid bookingData
- **Expected Output**: 
  - redisClient.expire được gọi với TTL = 1800
  - Cache key format: `booking:pending:${orderCode}`
- **Mocks**: Verify redisClient.expire called with correct arguments

---

### **EDGE CASES (3 test cases)**

#### **EDGE-1: Create booking with booking date at exact midnight**
- **Description**: bookingDate chính xác vào 00:00:00
- **Input**: bookingDate = `new Date('2025-11-01T00:00:00Z')`
- **Expected Output**: Booking được tạo thành công, xử lý đúng boundary case
- **Mocks**: checkBookingConflict handles midnight correctly

#### **EDGE-2: Create booking with very long duration (480 minutes)**
- **Description**: Duration = 8 giờ (max practical duration)
- **Input**: duration = 480
- **Expected Output**: Pending booking created với duration 480 minutes
- **Mocks**: checkBookingConflict validates long duration without conflicts

#### **EDGE-3: Create booking with special characters in location**
- **Description**: Location chứa ký tự đặc biệt và unicode
- **Input**: location = `"123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM (近くのカフェ)"`
- **Expected Output**: 
  - Location được lưu chính xác trong Redis
  - JSON serialization/deserialization không bị lỗi
- **Mocks**: Verify Redis JSON.set preserves special characters

---

### **ERROR SCENARIOS (3 test cases)**

#### **ERR-1: Booking conflict detected - overlapping time**
- **Description**: Có booking khác đã tồn tại trong khoảng thời gian bị trùng
- **Input**: Valid bookingData nhưng có conflict
- **Expected Error**: 
  - Error message: "Booking conflict detected. There is already a booking from 09:00 to 11:00 on 2025-11-01"
  - Error thrown from checkBookingConflict
- **Mocks**: 
  ```typescript
  checkBookingConflict.mockResolvedValue({
    hasConflict: true,
    conflictingBooking: {
      startTime: '09:00',
      endTime: '11:00',
      date: '2025-11-01'
    }
  })
  ```

#### **ERR-2: Redis connection failure when saving**
- **Description**: Redis không thể lưu dữ liệu (network error)
- **Input**: Valid bookingData
- **Expected Error**: 
  - Error message starts with "Failed to create booking:"
  - Wraps underlying Redis error
- **Mocks**: 
  ```typescript
  redisClient.json.set.mockRejectedValue(new Error('Redis connection lost'))
  ```

#### **ERR-3: Redis expire operation fails**
- **Description**: Set data thành công nhưng expire fails
- **Input**: Valid bookingData
- **Expected Error**: 
  - Error message: "Failed to create booking:"
  - Function should propagate expire error
- **Mocks**:
  ```typescript
  redisClient.json.set.mockResolvedValue('OK')
  redisClient.expire.mockRejectedValue(new Error('Expire command failed'))
  ```

---

### **INTEGRATION TEST (1 test case)**

#### **INT-1: Full workflow - conflict check → orderCode generation → Redis storage**
- **Description**: Test toàn bộ flow từ đầu đến cuối với real dependencies
- **Input**: Complete valid booking data
- **Expected Workflow**:
  1. checkBookingConflict được gọi với đúng params (muaId, bookingDate, duration)
  2. generateOrderCode được gọi 1 lần
  3. Booking object được tạo với status = PENDING
  4. formatBookingResponse được gọi
  5. redisClient.json.set được gọi với key `booking:pending:${orderCode}`
  6. redisClient.expire được gọi với TTL 1800
  7. Return object chứa đầy đủ: booking data + customerPhone + orderCode
- **Mocks**: Mock all dependencies, verify call order and arguments
- **Assertions**:
  - Verify all functions called in correct order
  - Verify Redis key format
  - Verify JSON serialization (JSON.parse(JSON.stringify()))
  - Verify returned object structure matches PendingBookingResponseDTO

---

## Total: 12 Test Cases
- **Happy Path**: 5
- **Edge Cases**: 3  
- **Error Scenarios**: 3
- **Integration**: 1

## Dependencies to Mock
- `checkBookingConflict` - Internal helper function
- `generateOrderCode` - From transaction.service
- `formatBookingResponse` - From booking.formatter utility
- `redisClient.json.set` - Redis JSON module
- `redisClient.expire` - Redis expire command
- `Booking` - Mongoose model constructor

## Key Testing Focus
1. **Conflict Detection**: Ensure checkBookingConflict prevents double bookings
2. **Redis Operations**: Verify correct JSON storage and TTL setting
3. **OrderCode Generation**: Unique identifier for payment tracking
4. **Data Serialization**: JSON.parse(JSON.stringify()) for Redis compatibility
5. **Error Propagation**: Proper error wrapping with context
6. **TTL Accuracy**: 1800 seconds (30 minutes) for payment window
