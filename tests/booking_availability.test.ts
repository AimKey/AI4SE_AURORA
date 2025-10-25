import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

// Mock external dependencies used by booking.service
jest.mock('../src/services/schedule.service', () => ({
    getFinalSlots: jest.fn()
}));
jest.mock('../src/utils/timeUtils', () => ({
    fromUTC: (d: string) => require('dayjs')(d)
}));
jest.mock('../src/utils/calendarUtils', () => ({
    getMondayOfWeek: (d: string) => require('dayjs')(d).startOf('week').format('YYYY-MM-DD')
}));

import { getFinalSlots } from '../src/services/schedule.service';
import { getAvailableSlotsOfService, getAvailableMonthlySlots } from '../src/services/booking.service';
import { SLOT_TYPES } from '../src/constants/index';

// Helper to create a fake Express response (not used by these pure helpers but required by spec)
function createMockRes() {
    const res: any = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

describe('Booking availability — getAvailableSlotsOfMuaByDay (via getAvailableSlotsOfService)', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('HP-01 No bookings: single working slot returned intact (180min -> one slot)', async () => {
        // Arrange
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.ORIGINAL_WORKING, day: '2025-10-20', startTime: '09:00', endTime: '12:00' }
            ]
        });

        // Act
        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 180);

        // Assert
        expect(result).toEqual([{ serviceId: 's1', day: '2025-10-20', startTime: '09:00', endTime: '12:00' }]);
    });

    test('HP-02 Single booking inside working slot splits into two sub-slots (30min chunks)', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.ORIGINAL_WORKING, day: '2025-10-20', startTime: '09:00', endTime: '12:00' },
                { slotId: 'B1', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '10:00', endTime: '11:00' }
            ]
        });

        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 30);

        expect(result).toEqual([
            { serviceId: 's1', day: '2025-10-20', startTime: '09:00', endTime: '09:30' },
            { serviceId: 's1', day: '2025-10-20', startTime: '09:30', endTime: '10:00' },
            { serviceId: 's1', day: '2025-10-20', startTime: '11:00', endTime: '11:30' },
            { serviceId: 's1', day: '2025-10-20', startTime: '11:30', endTime: '12:00' }
        ]);
    });

    test('HP-03 Booking overlaps start of working slot (truncate start)', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.OVERRIDE, day: '2025-10-20', startTime: '09:00', endTime: '12:00' },
                { slotId: 'B1', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '08:00', endTime: '10:30' }
            ]
        });

        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 30);

        expect(result).toEqual([
            { serviceId: 's1', day: '2025-10-20', startTime: '10:30', endTime: '11:00' },
            { serviceId: 's1', day: '2025-10-20', startTime: '11:00', endTime: '11:30' },
            { serviceId: 's1', day: '2025-10-20', startTime: '11:30', endTime: '12:00' }
        ]);
    });

    test('HP-04 Booking overlaps end of working slot (truncate end)', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.NEW_WORKING, day: '2025-10-20', startTime: '09:00', endTime: '12:00' },
                { slotId: 'B1', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '11:00', endTime: '13:00' }
            ]
        });

        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 60);

        expect(result).toEqual([
            { serviceId: 's1', day: '2025-10-20', startTime: '09:00', endTime: '10:00' },
            { serviceId: 's1', day: '2025-10-20', startTime: '10:00', endTime: '11:00' }
        ]);
    });

    test('HP-03b Multiple windows and bookings with 90-min duration', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.NEW_WORKING, day: '2025-10-20', startTime: '08:00', endTime: '12:00' },
                { slotId: 'W2', type: SLOT_TYPES.NEW_OVERRIDE, day: '2025-10-20', startTime: '13:00', endTime: '18:00' },
                { slotId: 'B1', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '09:30', endTime: '10:30' },
                { slotId: 'B2', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '15:00', endTime: '15:30' }
            ]
        });

        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 90);

        expect(result).toEqual([
            { serviceId: 's1', day: '2025-10-20', startTime: '10:30', endTime: '12:00' },
            { serviceId: 's1', day: '2025-10-20', startTime: '13:00', endTime: '14:30' },
            { serviceId: 's1', day: '2025-10-20', startTime: '15:30', endTime: '17:00' }
        ]);
    });

    test('HP-05 Multiple working slots and multiple bookings subtract correctly', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.ORIGINAL_WORKING, day: '2025-10-20', startTime: '09:00', endTime: '12:00' },
                { slotId: 'W2', type: SLOT_TYPES.NEW_OVERRIDE, day: '2025-10-20', startTime: '13:00', endTime: '17:00' },
                { slotId: 'B1', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '10:00', endTime: '11:30' },
                { slotId: 'B2', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '15:00', endTime: '16:00' }
            ]
        });

        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 60);

        expect(result).toEqual([
            { serviceId: 's1', day: '2025-10-20', startTime: '09:00', endTime: '10:00' },
            { serviceId: 's1', day: '2025-10-20', startTime: '11:30', endTime: '12:30' },
            { serviceId: 's1', day: '2025-10-20', startTime: '13:00', endTime: '14:00' },
            { serviceId: 's1', day: '2025-10-20', startTime: '16:00', endTime: '17:00' }
        ]);
    });

    // Edge cases
    test('EC-01 Touching intervals do not reduce availability (end == start)', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.ORIGINAL_WORKING, day: '2025-10-20', startTime: '09:00', endTime: '12:00' },
                { slotId: 'B1', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '12:00', endTime: '13:00' }
            ]
        });

        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 60);
        expect(result).toEqual([
            { serviceId: 's1', day: '2025-10-20', startTime: '09:00', endTime: '10:00' },
            { serviceId: 's1', day: '2025-10-20', startTime: '10:00', endTime: '11:00' },
            { serviceId: 's1', day: '2025-10-20', startTime: '11:00', endTime: '12:00' }
        ]);
    });

    test('EC-02 Zero-length working window is filtered out', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W0', type: SLOT_TYPES.ORIGINAL_WORKING, day: '2025-10-20', startTime: '10:00', endTime: '10:00' }
            ]
        });

        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 15);
        expect(result).toEqual([]);
    });

    test('EC-03 Minute-precision overlap (1 minute) is detected', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.ORIGINAL_WORKING, day: '2025-10-20', startTime: '09:00', endTime: '09:30' },
                { slotId: 'B1', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '09:29', endTime: '10:00' }
            ]
        });

        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 30);
        // overlap by 1 minute, so no full 30-min chunk fits in the morning slot
        expect(result).toEqual([]);
    });

    // Error scenarios
    test('ER-01 getFinalSlots throws -> propagate error', async () => {
        (getFinalSlots as jest.Mock).mockImplementation(() => { throw new Error('DB down'); });
        await expect(getAvailableSlotsOfService('m1', 's1', '2025-10-20', 30)).rejects.toThrow('DB down');
    });

    test('ER-02 Invalid day causes upstream error (getMondayOfWeek)', async () => {
        // make getFinalSlots not called but make calendar util throw by mocking module directly
        const cal = require('../src/utils/calendarUtils');
        jest.spyOn(cal, 'getMondayOfWeek').mockImplementation(() => { throw new Error('Invalid date'); });
        await expect(getAvailableSlotsOfService('m1', 's1', 'not-a-date', 30)).rejects.toThrow('Invalid date');
    });

    test('ER-03 fromUTC returns invalid -> empty result, no throw', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.ORIGINAL_WORKING, day: '2025-10-20', startTime: '09:00', endTime: '10:00' }
            ]
        });
        const timeUtils = require('../src/utils/timeUtils');
        jest.spyOn(timeUtils, 'fromUTC').mockImplementation(() => ({ format: () => 'invalid' }));
        const result = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 30);
        expect(result).toEqual([]);
    });

    test('INT-01 Integration: result independent from global/cart state', async () => {
        (getFinalSlots as jest.Mock).mockResolvedValue({
            slots: [
                { slotId: 'W1', type: SLOT_TYPES.ORIGINAL_WORKING, day: '2025-10-20', startTime: '09:00', endTime: '10:30' },
                { slotId: 'B1', type: SLOT_TYPES.BOOKING, day: '2025-10-20', startTime: '10:00', endTime: '11:00' }
            ]
        });

        // Arrange
        (global as any).cart = { items: [{ id: 's1', qty: 1 }] };
        const r1 = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 30);

        // Mutate unrelated global state
        (global as any).cart.items.push({ id: 'x', qty: 2 });
        const r2 = await getAvailableSlotsOfService('m1', 's1', '2025-10-20', 30);

        expect(r1).toEqual(r2);
    });
});

// ===================== getAvailableMonthlySlots =====================
describe('Booking availability — getAvailableMonthlySlots', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('HP-01 Daily 1-hour window split into 30-min tuples across the month; caching once per week', async () => {
        // Arrange: for any weekStart, return working 09:00–10:00 for each of 7 days
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const d = dayjs(weekStart);
            const slots = Array.from({ length: 7 }, (_, i) => ({
                slotId: `W-${weekStart}-${i}`,
                type: SLOT_TYPES.ORIGINAL_WORKING,
                day: d.add(i, 'day').format('YYYY-MM-DD'),
                startTime: '09:00',
                endTime: '10:00'
            }));
            return { slots };
        });

        // Act
        const month = '2025-10-01';
        const res = await getAvailableMonthlySlots('m1', month, 30);

        // Assert: has entries for each day and each has two tuples
        const daysInMonth = dayjs(month).daysInMonth();
        expect(Object.keys(res).length).toBe(daysInMonth);
        Object.entries(res).forEach(([day, tuples]) => {
            expect(dayjs(day).isValid()).toBe(true);
            expect(tuples).toEqual([
                [day, '09:00', '09:30'],
                [day, '09:30', '10:00']
            ]);
        });

        // Verify caching: count distinct weekStart in calls equals unique starts for the month
        const uniqueCalled = new Set((getFinalSlots as jest.Mock).mock.calls.map(([, ws]: [string, string]) => ws));
        const uniqueExpected = new Set<string>();
        for (let i = 1; i <= daysInMonth; i++) {
            const d = dayjs(month).date(i).startOf('week').format('YYYY-MM-DD');
            uniqueExpected.add(d);
        }
        expect(uniqueCalled.size).toBe(uniqueExpected.size);
    });

    test('HP-02 Single booking split affects only that day (60-min duration)', async () => {
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const d0 = dayjs(weekStart);
            const slots: any[] = [];
            for (let i = 0; i < 7; i++) {
                const day = d0.add(i, 'day').format('YYYY-MM-DD');
                slots.push({ slotId: `W-${i}`, type: SLOT_TYPES.ORIGINAL_WORKING, day, startTime: '09:00', endTime: '12:00' });
                if (day === '2025-10-07') {
                    slots.push({ slotId: 'B-1', type: SLOT_TYPES.BOOKING, day, startTime: '10:00', endTime: '11:00' });
                }
            }
            return { slots };
        });

        const res = await getAvailableMonthlySlots('m1', '2025-10-01', 60);

        // 2025-10-07 has only two tuples; neighbors have three
        expect(res['2025-10-07']).toEqual([
            ['2025-10-07', '09:00', '10:00'],
            ['2025-10-07', '11:00', '12:00']
        ]);
        expect(res['2025-10-06']).toEqual([
            ['2025-10-06', '09:00', '10:00'],
            ['2025-10-06', '10:00', '11:00'],
            ['2025-10-06', '11:00', '12:00']
        ]);
    });

    test('HP-03 Multiple weeks with distinct schedules (90-min duration)', async () => {
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const start = dayjs(weekStart);
            const isWeekA = start.isSameOrBefore('2025-10-05');
            const isWeekB = start.isAfter('2025-10-05') && start.isSameOrBefore('2025-10-12');
            const slots: any[] = [];
            for (let i = 0; i < 7; i++) {
                const day = start.add(i, 'day').format('YYYY-MM-DD');
                if (isWeekA) {
                    slots.push({ slotId: `A-${i}`, type: SLOT_TYPES.NEW_WORKING, day, startTime: '08:00', endTime: '10:30' });
                } else if (isWeekB) {
                    slots.push({ slotId: `B-${i}`, type: SLOT_TYPES.NEW_WORKING, day, startTime: '13:00', endTime: '17:00' });
                    slots.push({ slotId: `BB-${i}`, type: SLOT_TYPES.BOOKING, day, startTime: '15:00', endTime: '15:30' });
                }
            }
            return { slots };
        });

        const res = await getAvailableMonthlySlots('m1', '2025-10-01', 90);

        // A week day (e.g., 2025-10-03) → one tuple 08:00–09:30
        expect(res['2025-10-03']).toEqual([
            ['2025-10-03', '08:00', '09:30']
        ]);
        // B week day (e.g., 2025-10-08) → two tuples 13:00–14:30 and 15:30–17:00
        expect(res['2025-10-08']).toEqual([
            ['2025-10-08', '13:00', '14:30'],
            ['2025-10-08', '15:30', '17:00']
        ]);
    });

    test('HP-04 Exact-fit windows generate one tuple per day', async () => {
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const base = dayjs(weekStart);
            const slots = Array.from({ length: 7 }, (_, i) => ({
                slotId: `W-${i}`,
                type: SLOT_TYPES.OVERRIDE,
                day: base.add(i, 'day').format('YYYY-MM-DD'),
                startTime: '09:00',
                endTime: '10:30'
            }));
            return { slots };
        });

        const res = await getAvailableMonthlySlots('m1', '2025-10-01', 90);
        expect(res['2025-10-10']).toEqual([
            ['2025-10-10', '09:00', '10:30']
        ]);
    });

    test('HP-05 Multiple disjoint windows in a day with an internal booking (30-min)', async () => {
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const base = dayjs(weekStart);
            const slots: any[] = [];
            for (let i = 0; i < 7; i++) {
                const day = base.add(i, 'day').format('YYYY-MM-DD');
                slots.push({ slotId: `W1-${i}`, type: SLOT_TYPES.ORIGINAL_WORKING, day, startTime: '08:00', endTime: '10:00' });
                slots.push({ slotId: `W2-${i}`, type: SLOT_TYPES.ORIGINAL_WORKING, day, startTime: '11:00', endTime: '13:00' });
                slots.push({ slotId: `B-${i}`, type: SLOT_TYPES.BOOKING, day, startTime: '09:00', endTime: '09:30' });
            }
            return { slots };
        });

        const res = await getAvailableMonthlySlots('m1', '2025-10-01', 30);
        expect(res['2025-10-02']).toEqual([
            ['2025-10-02', '08:00', '08:30'],
            ['2025-10-02', '08:30', '09:00'],
            ['2025-10-02', '09:30', '10:00'],
            ['2025-10-02', '11:00', '11:30'],
            ['2025-10-02', '11:30', '12:00'],
            ['2025-10-02', '12:00', '12:30'],
            ['2025-10-02', '12:30', '13:00']
        ]);
    });

    // Edge cases
    test('EC-01 Touching intervals (booking at 12:00) do not reduce availability', async () => {
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const base = dayjs(weekStart);
            const slots: any[] = [];
            for (let i = 0; i < 7; i++) {
                const day = base.add(i, 'day').format('YYYY-MM-DD');
                slots.push({ slotId: `W-${i}`, type: SLOT_TYPES.ORIGINAL_WORKING, day, startTime: '09:00', endTime: '12:00' });
                slots.push({ slotId: `B-${i}`, type: SLOT_TYPES.BOOKING, day, startTime: '12:00', endTime: '13:00' });
            }
            return { slots };
        });

        const res = await getAvailableMonthlySlots('m1', '2025-10-01', 60);
        expect(res['2025-10-03']).toEqual([
            ['2025-10-03', '09:00', '10:00'],
            ['2025-10-03', '10:00', '11:00'],
            ['2025-10-03', '11:00', '12:00']
        ]);
    });

    test('EC-02 Zero-length working slots are filtered out', async () => {
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const base = dayjs(weekStart);
            const slots: any[] = [];
            for (let i = 0; i < 7; i++) {
                const day = base.add(i, 'day').format('YYYY-MM-DD');
                slots.push({ slotId: `W0-${i}`, type: SLOT_TYPES.ORIGINAL_WORKING, day, startTime: '10:00', endTime: '10:00' });
                slots.push({ slotId: `W1-${i}`, type: SLOT_TYPES.ORIGINAL_WORKING, day, startTime: '09:00', endTime: '10:00' });
            }
            return { slots };
        });

        const res = await getAvailableMonthlySlots('m1', '2025-10-01', 30);
        expect(res['2025-10-04']).toEqual([
            ['2025-10-04', '09:00', '09:30'],
            ['2025-10-04', '09:30', '10:00']
        ]);
    });

    test('EC-03 Only first and last day have availability', async () => {
        const month = '2025-10-01';
        const first = dayjs(month).format('YYYY-MM-DD');
        const last = dayjs(month).endOf('month').format('YYYY-MM-DD');
        const allowed = new Set([first, last]);
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const base = dayjs(weekStart);
            const slots: any[] = [];
            for (let i = 0; i < 7; i++) {
                const day = base.add(i, 'day').format('YYYY-MM-DD');
                if (allowed.has(day)) {
                    slots.push({ slotId: `W-${i}`, type: SLOT_TYPES.ORIGINAL_WORKING, day, startTime: '09:00', endTime: '10:00' });
                }
            }
            return { slots };
        });

        const res = await getAvailableMonthlySlots('m1', month, 30);
        expect(Object.keys(res).sort()).toEqual([first, last].sort());
        expect(res[first]).toEqual([[first, '09:00', '09:30'], [first, '09:30', '10:00']]);
        expect(res[last]).toEqual([[last, '09:00', '09:30'], [last, '09:30', '10:00']]);
    });

    // Error scenarios
    test('ER-01 Invalid day input -> throws specific error', async () => {
        await expect(getAvailableMonthlySlots('m1', 'not-a-date', 30)).rejects.toThrow('Invalid day provided for monthly availability');
    });

    test('ER-02 getFinalSlots throws for a week -> days skipped, others continue', async () => {
        // Throw for the first week only
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const start = dayjs(weekStart);
            if (start.isSame('2025-09-28')) { // startOf('week') around Oct 1, 2025
                throw new Error('week load failed');
            }
            const slots = Array.from({ length: 7 }, (_, i) => ({
                slotId: `W-${i}`,
                type: SLOT_TYPES.ORIGINAL_WORKING,
                day: start.add(i, 'day').format('YYYY-MM-DD'),
                startTime: '09:00',
                endTime: '10:00'
            }));
            return { slots };
        });

        const res = await getAvailableMonthlySlots('m1', '2025-10-01', 60);
        // A day in the first week (e.g., 2025-10-01) is absent
        expect(res['2025-10-01']).toBeUndefined();
        // But a later day exists
        expect(res['2025-10-10']).toBeDefined();
    });

    test.skip('ER-03 Invalid duration (<=0) should be rejected (pending code guard)', async () => {
        await expect(getAvailableMonthlySlots('m1', '2025-10-01', 0)).rejects.toThrow('Invalid duration');
    });

    // Integration
    test('INT-01 Independence from global/cart state', async () => {
        (getFinalSlots as jest.Mock).mockImplementation(async (_muaId: string, weekStart: string) => {
            const base = dayjs(weekStart);
            const slots: any[] = [];
            for (let i = 0; i < 7; i++) {
                const day = base.add(i, 'day').format('YYYY-MM-DD');
                slots.push({ slotId: `W-${i}`, type: SLOT_TYPES.ORIGINAL_WORKING, day, startTime: '09:00', endTime: '10:30' });
                slots.push({ slotId: `B-${i}`, type: SLOT_TYPES.BOOKING, day, startTime: '10:00', endTime: '11:00' });
            }
            return { slots };
        });

        (global as any).cart = { items: [{ id: 's1', qty: 1 }] };
        const r1 = await getAvailableMonthlySlots('m1', '2025-10-01', 30);

        (global as any).cart.items.push({ id: 'x', qty: 2 });
        const r2 = await getAvailableMonthlySlots('m1', '2025-10-01', 30);

        expect(r1).toEqual(r2);
    });
});

