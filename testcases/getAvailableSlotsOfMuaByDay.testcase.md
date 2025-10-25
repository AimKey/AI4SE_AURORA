# Test cases for BookingService.getAvailableSlotsOfMuaByDay

Function signature:
- getAvailableSlotsOfMuaByDay(muaId: string, day: string): Promise<ISlot[]>

Notes:
- Purpose: compute the raw available working sub-slots for a MUA on a specific day by subtracting booking slots from working slots.
- Dependencies to mock in unit tests:
  - getFinalSlots(muaId, weekStart) from `src/services/schedule.service.ts`
  - fromUTC(dateStr) from `src/utils/timeUtils.ts` (recommend mocking to identity: returns dayjs(dateStr))
  - getMondayOfWeek(dateStr, fmt) from `src/utils/calendarUtils.ts` (simple deterministic return or compute via dayjs for tests)
  - SLOT_TYPES from `src/constants/index.ts` (use stable enum values in fixtures)
- Internal helpers exercised implicitly: slotsOverlap, subtractBookedFromWorking.
- All date strings use format YYYY-MM-DD and time HH:mm.

---

## Happy path scenarios (5)

HP-01 — No bookings, single working slot returned intact
- Purpose: availability equals working hours when there are no bookings.
- Mocks:
  - getFinalSlots => { slots: [ { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" } ] }
  - fromUTC("2025-10-20").format("YYYY-MM-DD") => "2025-10-20"
- Input: (muaId: "m1", day: "2025-10-20")
- Expected: [ { day: "2025-10-20", startTime: "09:00", endTime: "12:00" } ]
- Assertions: array length 1; exact times preserved; type filtering applied implicitly.

HP-02 — Single booking fully inside working slot splits into two sub-slots
- Mocks:
  - getFinalSlots => {
      slots: [
        { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" },
        { slotId: "B1", type: SLOT_TYPES.BOOKING,          day: "2025-10-20", startTime: "10:00", endTime: "11:00" }
      ]
    }
  - fromUTC("2025-10-20") => same day
- Input: ("m1", "2025-10-20")
- Expected: two slots
  - { day: "2025-10-20", startTime: "09:00", endTime: "10:00" }
  - { day: "2025-10-20", startTime: "11:00", endTime: "12:00" }
- Assertions: length 2; no overlaps with booking; boundaries exact.

HP-03 — Booking overlaps start of working slot (truncate start)
- Mocks:
  - getFinalSlots => {
      slots: [
        { slotId: "W1", type: SLOT_TYPES.OVERRIDE, day: "2025-10-20", startTime: "09:00", endTime: "12:00" },
        { slotId: "B1", type: SLOT_TYPES.BOOKING,  day: "2025-10-20", startTime: "08:00", endTime: "10:30" }
      ]
    }
- Expected: [ { day: "2025-10-20", startTime: "10:30", endTime: "12:00" } ]
- Assertions: single truncated slot; start equals booking end.

HP-04 — Booking overlaps end of working slot (truncate end)
- Mocks:
  - getFinalSlots => {
      slots: [
        { slotId: "W1", type: SLOT_TYPES.NEW_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" },
        { slotId: "B1", type: SLOT_TYPES.BOOKING,     day: "2025-10-20", startTime: "11:00", endTime: "13:00" }
      ]
    }
- Expected: [ { day: "2025-10-20", startTime: "09:00", endTime: "11:00" } ]
- Assertions: single truncated slot; end equals booking start.

HP-05 — Multiple working slots and multiple bookings; subtraction across all
- Mocks:
  - getFinalSlots => {
      slots: [
        { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" },
        { slotId: "W2", type: SLOT_TYPES.NEW_OVERRIDE,     day: "2025-10-20", startTime: "13:00", endTime: "17:00" },
        { slotId: "B1", type: SLOT_TYPES.BOOKING,          day: "2025-10-20", startTime: "10:00", endTime: "11:30" },
        { slotId: "B2", type: SLOT_TYPES.BOOKING,          day: "2025-10-20", startTime: "15:00", endTime: "16:00" }
      ]
    }
- Expected: [
  { day: "2025-10-20", startTime: "09:00", endTime: "10:00" },
  { day: "2025-10-20", startTime: "11:30", endTime: "12:00" },
  { day: "2025-10-20", startTime: "13:00", endTime: "15:00" },
  { day: "2025-10-20", startTime: "16:00", endTime: "17:00" }
]
- Assertions: order preserved by processing; all bookings subtracted from all working windows.

---

## Edge cases / boundary values (3)

EC-01 — Booking exactly equals working slot (full coverage => no availability)
- Mocks:
  - getFinalSlots => {
      slots: [
        { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" },
        { slotId: "B1", type: SLOT_TYPES.BOOKING,          day: "2025-10-20", startTime: "09:00", endTime: "12:00" }
      ]
    }
- Expected: []
- Assertions: empty array; no zero-length remnants remain after final validation.

EC-02 — Touching intervals are not overlap (end == start)
- Mocks:
  - getFinalSlots => {
      slots: [
        { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" },
        { slotId: "B1", type: SLOT_TYPES.BOOKING,          day: "2025-10-20", startTime: "12:00", endTime: "13:00" }
      ]
    }
- Expected: [ { day: "2025-10-20", startTime: "09:00", endTime: "12:00" } ]
- Assertions: booking does not alter working slot when only touching at the boundary.

EC-03 — Invalid input slots (zero-length working or malformed times) are filtered out
- Mocks:
  - getFinalSlots => {
      slots: [
        { slotId: "W0", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "10:00", endTime: "10:00" },
        { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "10:00" },
        { slotId: "B1", type: SLOT_TYPES.BOOKING,          day: "2025-10-20", startTime: "xx:yy", endTime: "zz:tt" }
      ]
    }
- Expected: [ { day: "2025-10-20", startTime: "09:00", endTime: "10:00" } ]
- Rationale: zero-length W0 filtered by final isBefore check; malformed booking ignored (no overlap effect) leading to W1 intact.

---

## Error scenarios (3)

ER-01 — getFinalSlots throws -> function propagates error
- Mocks:
  - getFinalSlots => throws new Error("DB down")
- Input: ("m1", "2025-10-20")
- Expected: Promise rejects with the same error
- Assertions: toThrow / rejects.toThrow("DB down")

ER-02 — Invalid day string leads to error (getMondayOfWeek or day parsing)
- Mocks:
  - getMondayOfWeek("not-a-date", "YYYY-MM-DD") => throw new Error("Invalid date")
- Input: ("m1", "not-a-date")
- Expected: Promise rejects with error

ER-03 — fromUTC returns invalid -> results in no matches but no throw
- Mocks:
  - fromUTC => returns dayjs.invalid() or an object whose format() returns "invalid"
  - getFinalSlots => returns slots for day "2025-10-20"
- Input: ("m1", "2025-10-20")
- Expected: [] and no exception (filter by day === "invalid" yields empty workings/bookings)

---

## Integration with cart state (1)

INT-01 — Result independent from global/cart state
- Purpose: confirm function output unaffected by unrelated global state.
- Setup:
  - global.cart = { items: [{ id: "svc1", qty: 1 }] }
  - Mock getFinalSlots => { slots: [ { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "10:30" }, { slotId: "B1", type: SLOT_TYPES.BOOKING, day: "2025-10-20", startTime: "10:00", endTime: "11:00" } ] }
  - fromUTC("2025-10-20") => same day
- Steps:
  1. Call getAvailableSlotsOfMuaByDay("m1", "2025-10-20") -> result R1
  2. Mutate global.cart (push/remove items)
  3. Call getAvailableSlotsOfMuaByDay("m1", "2025-10-20") -> result R2
- Expected: R1 deep-equals R2 (e.g., [ { day: "2025-10-20", startTime: "09:00", endTime: "10:00" } ])

---

## Implementation notes for tests
- Use Jest and mock modules:
  - jest.mock("src/services/schedule.service", () => ({ getFinalSlots: jest.fn() }))
  - jest.mock("utils/timeUtils", () => ({ fromUTC: (d: string) => dayjs(d) }))
  - jest.mock("utils/calendarUtils", () => ({ getMondayOfWeek: (d: string) => dayjs(d).startOf("week").format("YYYY-MM-DD") }))
- Prefer deterministic ISO dates to avoid timezone ambiguity.
- Validate that returned slots have start < end (no zero-length outputs).
- If importing the function directly is not possible (non-exported), test via exported `getAvailableSlotsOfService` for integration, or re-export under a test-only build.
