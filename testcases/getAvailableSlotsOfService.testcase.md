# Test cases for BookingService.getAvailableSlotsOfService

Function signature:
- getAvailableSlotsOfService(muaId: string, serviceId: string, day: string, durationMinutes: number): Promise<IBookingSlot[]>

Notes:
- Purpose: produce duration-based booking slots for a specific service/day by splitting the day’s available working windows.
- This function internally calls getAvailableSlotsOfMuaByDay (non-exported in the same module). To control inputs in unit tests, mock its dependencies:
	- getFinalSlots from `src/services/schedule.service`
	- fromUTC from `utils/timeUtils`
	- getMondayOfWeek from `utils/calendarUtils`
- Internal helper splitSlotByDuration performs contiguous splitting; we don’t mock it but validate outputs.
- All date strings use format YYYY-MM-DD and times HH:mm.

---

## Happy path scenarios (5)

HP-01 — Single working slot, no bookings, 60-min duration → 3 slots
- Mocks:
	- getFinalSlots => { slots: [ { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" } ] }
	- fromUTC("2025-10-20").format("YYYY-MM-DD") => "2025-10-20"
- Input: (muaId: "m1", serviceId: "s1", day: "2025-10-20", durationMinutes: 60)
- Expected (order matters):
	- [
		{ serviceId: "s1", day: "2025-10-20", startTime: "09:00", endTime: "10:00" },
		{ serviceId: "s1", day: "2025-10-20", startTime: "10:00", endTime: "11:00" },
		{ serviceId: "s1", day: "2025-10-20", startTime: "11:00", endTime: "12:00" }
	]

HP-02 — Working slot with a booking subtracted, 30-min duration → 4 slots
- Mocks:
	- getFinalSlots => {
			slots: [
				{ slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" },
				{ slotId: "B1", type: SLOT_TYPES.BOOKING,          day: "2025-10-20", startTime: "10:00", endTime: "11:00" }
			]
		}
- Input: ("m1", "s1", "2025-10-20", 30)
- Expected:
	- [
		{ serviceId: "s1", day: "2025-10-20", startTime: "09:00", endTime: "09:30" },
		{ serviceId: "s1", day: "2025-10-20", startTime: "09:30", endTime: "10:00" },
		{ serviceId: "s1", day: "2025-10-20", startTime: "11:00", endTime: "11:30" },
		{ serviceId: "s1", day: "2025-10-20", startTime: "11:30", endTime: "12:00" }
	]

HP-03 — Multiple working windows and bookings, 90-min duration
- Mocks:
	- getFinalSlots => {
			slots: [
				{ slotId: "W1", type: SLOT_TYPES.NEW_WORKING,  day: "2025-10-20", startTime: "08:00", endTime: "12:00" },
				{ slotId: "W2", type: SLOT_TYPES.NEW_OVERRIDE, day: "2025-10-20", startTime: "13:00", endTime: "18:00" },
				{ slotId: "B1", type: SLOT_TYPES.BOOKING,       day: "2025-10-20", startTime: "09:30", endTime: "10:30" },
				{ slotId: "B2", type: SLOT_TYPES.BOOKING,       day: "2025-10-20", startTime: "15:00", endTime: "15:30" }
			]
		}
- Input: ("m1", "s1", "2025-10-20", 90)
- Expected: slots that fit exactly within the remaining windows, e.g.,
	- Morning: 08:00–09:30 and 10:30–12:00 → one 90-min chunk from 10:30–12:00 only
	- Afternoon: 13:00–15:00 and 15:30–18:00 → two 90-min chunks 13:00–14:30 and 15:30–17:00; 17:00–18:00 leftover ignored
	- Final:
		[
			{ serviceId: "s1", day: "2025-10-20", startTime: "10:30", endTime: "12:00" },
			{ serviceId: "s1", day: "2025-10-20", startTime: "13:00", endTime: "14:30" },
			{ serviceId: "s1", day: "2025-10-20", startTime: "15:30", endTime: "17:00" }
		]

HP-04 — Duration equals available slot length → single slot
- Mocks:
	- getFinalSlots => { slots: [ { slotId: "W1", type: SLOT_TYPES.OVERRIDE, day: "2025-10-20", startTime: "09:00", endTime: "10:30" } ] }
- Input: ("m1", "s1", "2025-10-20", 90)
- Expected: [ { serviceId: "s1", day: "2025-10-20", startTime: "09:00", endTime: "10:30" } ]

HP-05 — Multiple distinct working windows with no bookings, 45-min duration
- Mocks:
	- getFinalSlots => {
			slots: [
				{ slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "08:00", endTime: "09:30" },
				{ slotId: "W2", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "10:00", endTime: "11:30" }
			]
		}
- Input: ("m1", "s1", "2025-10-20", 45)
- Expected:
	- [
		{ serviceId: "s1", day: "2025-10-20", startTime: "08:00", endTime: "08:45" },
		{ serviceId: "s1", day: "2025-10-20", startTime: "08:45", endTime: "09:30" },
		{ serviceId: "s1", day: "2025-10-20", startTime: "10:00", endTime: "10:45" },
		{ serviceId: "s1", day: "2025-10-20", startTime: "10:45", endTime: "11:30" }
	]

---

## Edge cases / boundary values (3)

EC-01 — Duration doesn’t divide slot evenly → tail ignored
- Mocks:
	- getFinalSlots => { slots: [ { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "10:20" } ] }
- Input: ("m1", "s1", "2025-10-20", 30)
- Expected: [ 09:00–09:30, 09:30–10:00 ] only; remaining 20 minutes ignored; serviceId set to s1.

EC-02 — Touching intervals around a booking create exact split boundaries
- Mocks:
	- getFinalSlots => {
			slots: [
				{ slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "12:00" },
				{ slotId: "B1", type: SLOT_TYPES.BOOKING,          day: "2025-10-20", startTime: "10:00", endTime: "10:00" }
			]
		}
- Input: ("m1", "s1", "2025-10-20", 60)
- Expected: booking has zero length, should not affect windows; results = [09:00–10:00, 10:00–11:00, 11:00–12:00].

EC-03 — Zero-length working window is filtered out (no splits)
- Mocks:
	- getFinalSlots => { slots: [ { slotId: "W0", type: SLOT_TYPES.OVERRIDE, day: "2025-10-20", startTime: "10:00", endTime: "10:00" } ] }
- Input: ("m1", "s1", "2025-10-20", 15)
- Expected: []

---

## Error scenarios (3)

ER-01 — getFinalSlots throws inside getAvailableSlotsOfMuaByDay → propagate rejection
- Mocks: getFinalSlots => throws new Error("DB down")
- Input: ("m1", "s1", "2025-10-20", 30)
- Expected: getAvailableSlotsOfService rejects with the same error.

ER-02 — Invalid day produces error in getMondayOfWeek/fromUTC path → reject
- Mocks:
	- getMondayOfWeek("not-a-date", "YYYY-MM-DD") => throw new Error("Invalid date")
- Input: ("m1", "s1", "not-a-date", 30)
- Expected: Promise rejects.

ER-03 — Invalid duration (<= 0) should be rejected to avoid infinite loop
- Input: ("m1", "s1", "2025-10-20", 0)
- Expected: Test expects the function to throw/reject with a clear error like "Invalid duration".
- Note: Current implementation lacks a guard and would loop indefinitely when durationMinutes <= 0; consider adding a validation check.

---

## Integration with cart state (1)

INT-01 — Output independent from global/cart state
- Purpose: confirm purity with respect to unrelated global state.
- Mocks:
	- getFinalSlots => { slots: [ { slotId: "W1", type: SLOT_TYPES.ORIGINAL_WORKING, day: "2025-10-20", startTime: "09:00", endTime: "10:30" }, { slotId: "B1", type: SLOT_TYPES.BOOKING, day: "2025-10-20", startTime: "10:00", endTime: "11:00" } ] }
- Steps:
	1. Set global.cart = { items: [{ id: "s1", qty: 1 }] }.
	2. Call getAvailableSlotsOfService("m1", "s1", "2025-10-20", 30) → R1 (expect [09:00–09:30, 09:30–10:00]).
	3. Mutate global.cart (add/remove items).
	4. Call again → R2.
- Expected: R1 deep-equals R2; results contain serviceId "s1".

---

## Mocking guidance and implementation notes
- Mock modules rather than internal functions:
	- jest.mock("src/services/schedule.service", () => ({ getFinalSlots: jest.fn() }))
	- jest.mock("utils/timeUtils", () => ({ fromUTC: (d: string) => require("dayjs")(d) }))
	- jest.mock("utils/calendarUtils", () => ({ getMondayOfWeek: (d: string) => require("dayjs")(d).startOf("week").format("YYYY-MM-DD") }))
- Import the function under test from `src/services/booking.service`.
- Verify each returned slot includes the provided serviceId and that start < end.
- Prefer ISO dates to avoid timezone ambiguity.
- Consider adding a guard in code: if (durationMinutes <= 0) throw new Error("Invalid duration").
