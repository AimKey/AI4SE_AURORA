# Test cases for BookingService.getAvailableMonthlySlots

Function signature:
- getAvailableMonthlySlots(muaId: string, day: string, durationMinutes: number): Promise<Record<string, [string, string, string][]>>

Notes:
- Purpose: compute a month-view of duration-sized booking tuples per day by subtracting bookings from working windows and splitting by duration.
- Dependencies to mock:
  - getFinalSlots(muaId, weekStart) from `src/services/schedule.service`
  - getMondayOfWeek(dateStr, fmt) from `utils/calendarUtils` (affects weekly caching)
  - fromUTC(dateStr) from `utils/timeUtils` (affects which slots match `slot.day`)
  - SLOT_TYPES from `src/constants/index`
- Internal helpers exercised implicitly: subtractBookedFromWorking, splitSlotByDuration, slotsOverlap.
- The function only adds a day key if at least one duration-based slot exists for that day.
- Tuples are [day, startTime, endTime] where endTime is recomputed as start + durationMinutes.

---

## Happy path scenarios (5)

HP-01 — Daily 1-hour working window across the month, 30-min duration → 2 slots/day
- Setup:
  - Base month: day = "2025-10-01" (31 days)
  - getMondayOfWeek returns correct ISO Monday for any date
  - getFinalSlots for each distinct weekStart returns slots containing a working slot for each day of that week: 09:00–10:00
- Input: (muaId: "m1", day: "2025-10-01", durationMinutes: 30)
- Expected:
  - Result has 31 keys (one per day)
  - Each key maps to: [ ["YYYY-MM-DD", "09:00", "09:30"], ["YYYY-MM-DD", "09:30", "10:00"] ]
  - Verify that getFinalSlots is called once per distinct weekStart (typically 5 for a 31-day month) due to cache.

HP-02 — Single booking split in a week affects only its day
- Setup:
  - For the week containing "2025-10-07": finalSlots include for each day 09:00–12:00 working; plus a BOOKING 10:00–11:00 only on day "2025-10-07".
  - Other weeks return 09:00–12:00 working only.
- Input: ("m1", "2025-10-01", 60)
- Expected:
  - For most days: 3 tuples → [09:00–10:00], [10:00–11:00], [11:00–12:00]
  - For 2025-10-07 specifically: 2 tuples → [09:00–10:00], [11:00–12:00]
  - All other days unaffected.

HP-03 — Multiple weeks with distinct schedules; results union across month
- Setup:
  - Week A (first week): daily working 08:00–10:30
  - Week B (second week): daily working 13:00–17:00 and a daily BOOKING 15:00–15:30
  - Remaining weeks: no working slots
- Input: ("m1", "2025-10-01", 90)
- Expected:
  - For Week A days: one tuple [08:00–09:30] (tail 09:30–10:30 not enough for 90 minutes)
  - For Week B days: one tuple [13:00–14:30] (window 15:30–17:00 is 90 minutes → also one tuple [15:30–17:00]) → two tuples per day in Week B
  - Other days absent from the result.

HP-04 — Exact-fit windows generate one tuple per day
- Setup:
  - For all weeks, working per day is 09:00–10:30
- Input: ("m1", "2025-10-01", 90)
- Expected: each present day has exactly one tuple [09:00, 10:30].

HP-05 — Multiple disjoint windows in a day, bookings in-between
- Setup (for a single week):
  - Working windows: [08:00–10:00], [11:00–13:00]
  - Booking: [09:00–09:30] (affects first window only)
- Input: ("m1", "2025-10-01", 30)
- Expected per day in that week:
  - From [08:00–10:00] minus [09:00–09:30] → [08:00–09:00], [09:30–10:00] → 3 tuples (08:00–08:30, 08:30–09:00, 09:30–10:00)
  - From [11:00–13:00] → 4 tuples (11:00–11:30, 11:30–12:00, 12:00–12:30, 12:30–13:00)
  - Total 7 tuples for those days; other weeks/days as configured.

---

## Edge cases / boundary values (3)

EC-01 — Touching intervals don’t reduce availability
- Setup:
  - Working: 09:00–12:00 daily in a week
  - Booking: 12:00–13:00 (touches end)
- Input: ("m1", "2025-10-01", 60)
- Expected: each day still has [09:00–10:00], [10:00–11:00], [11:00–12:00]

EC-02 — Zero-length or invalid working slots filtered out
- Setup in a week’s finalSlots:
  - Working: W0 [10:00–10:00] (zero length), W1 [09:00–10:00]
- Input: ("m1", "2025-10-01", 30)
- Expected for those days: only W1 contributes → [09:00–09:30], [09:30–10:00]

EC-03 — First and last day of month edge
- Setup:
  - Only first day (YYYY-MM-01) and last day (YYYY-MM-31) have working 09:00–10:00.
- Input: ("m1", "2025-10-01", 30)
- Expected: result has exactly two keys (first and last days), each with two tuples.

---

## Error scenarios (3)

ER-01 — Invalid day input → immediate throw
- Input: ("m1", "not-a-date", 30)
- Expected: rejects with Error("Invalid day provided for monthly availability")

ER-02 — getFinalSlots throws for a week → day skipped, others continue
- Setup:
  - For weekStart A: getFinalSlots throws new Error("week load failed")
  - For other weekStarts: normal working slots
- Input: ("m1", "2025-10-01", 60)
- Expected: result contains days for other weeks; days in Week A are absent; function doesn’t throw.

ER-03 — Invalid duration (<= 0) should be rejected to avoid infinite loop
- Input: ("m1", "2025-10-01", 0)
- Expected: test should expect the function to reject (e.g., with "Invalid duration").
- Note: Current implementation lacks a guard; without fixing the code this would hang. Add a validation like: if (durationMinutes <= 0) throw new Error("Invalid duration").

---

## Integration with cart state (1)

INT-01 — Independence from unrelated global/cart state
- Purpose: ensure results are pure w.r.t unrelated state.
- Setup:
  - global.cart = { items: [{ id: "s1", qty: 1 }] }
  - One week with day-level working 09:00–10:30 and booking 10:00–11:00 → effective 09:00–10:00 daily
- Steps:
  1. Call getAvailableMonthlySlots("m1", "2025-10-01", 30) → R1
  2. Mutate global.cart (add/remove items)
  3. Call again → R2
- Expected: R1 deep-equals R2 (e.g., each present day has [ [day, "09:00", "09:30"], [day, "09:30", "10:00"] ]).

---

## Mocking guidance and notes
- Mock modules (not internal helpers):
  - jest.mock("src/services/schedule.service", () => ({ getFinalSlots: jest.fn() }))
  - jest.mock("utils/timeUtils", () => ({ fromUTC: (d: string) => require("dayjs")(d) }))
  - jest.mock("utils/calendarUtils", () => ({ getMondayOfWeek: (d: string) => require("dayjs")(d).startOf("week").format("YYYY-MM-DD") }))
- Verify caching: count calls to getFinalSlots by distinct weekStart.
- Use deterministic ISO dates to avoid timezone issues.
- Assert that for each key, tuples’ third value equals start + durationMinutes.
- Ensure no day with zero tuples appears in the result.
