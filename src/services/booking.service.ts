import type {ISlot } from "types/schedule.interfaces";
import { getMondayOfWeek } from "utils/calendarUtils";
import { getFinalSlots } from "./schedule.service";
import { fromUTC, toUTC } from "utils/timeUtils";
import { SLOT_TYPES, BOOKING_STATUS, BOOKING_TYPES, TRANSACTION_STATUS, MUA_STATUS } from "constants/index";
import { Booking } from "models/bookings.models";
import type { CreateBookingDTO, UpdateBookingDTO, BookingResponseDTO, IBookingSlot, IAvailableMuaServices, PendingBookingResponseDTO } from "types/booking.dtos";
import dayjs from "dayjs";
import type { MuaResponseDTO, ServiceResponseDTO } from "types";
import { MUA } from "@models/muas.models";
import { ServicePackage } from "@models/services.models";
import mongoose from "mongoose";
import { redisClient } from "config/redis";
import { generateOrderCode } from "./transaction.service";
import { invalidateWeeklyCache } from "./slot.service";
import { BOOKING_STATUS as BOOKING_STATUS_CONST } from "constants/booking";
import { hasBookingEnded } from "constants/booking";

// Helper function to check if two time slots overlap
function slotsOverlap(slot1: ISlot, slot2: ISlot): boolean {
  if (slot1.day !== slot2.day) return false;
  
  const start1 = dayjs(`${slot1.day} ${slot1.startTime}`, "YYYY-MM-DD HH:mm");
  const end1 = dayjs(`${slot1.day} ${slot1.endTime}`, "YYYY-MM-DD HH:mm");
  const start2 = dayjs(`${slot2.day} ${slot2.startTime}`, "YYYY-MM-DD HH:mm");
  const end2 = dayjs(`${slot2.day} ${slot2.endTime}`, "YYYY-MM-DD HH:mm");
  
  return start1.isBefore(end2) && start2.isBefore(end1);
}

// Function to subtract booked time from working slots
function subtractBookedFromWorking(workingSlot: ISlot, bookingSlot: ISlot): ISlot[] {
  if (!slotsOverlap(workingSlot, bookingSlot)) {
    return [workingSlot];
  }
  
  const workStart = dayjs(`${workingSlot.day} ${workingSlot.startTime}`, "YYYY-MM-DD HH:mm");
  const workEnd = dayjs(`${workingSlot.day} ${workingSlot.endTime}`, "YYYY-MM-DD HH:mm");
  const bookStart = dayjs(`${bookingSlot.day} ${bookingSlot.startTime}`, "YYYY-MM-DD HH:mm");
  const bookEnd = dayjs(`${bookingSlot.day} ${bookingSlot.endTime}`, "YYYY-MM-DD HH:mm");
  
  const result: ISlot[] = [];
  
  // If booking starts after working slot starts, create a slot before booking
  if (bookStart.isAfter(workStart)) {
    result.push({
      ...workingSlot,
      endTime: bookStart.format("HH:mm"),
      slotId: `${workingSlot.slotId}_before_${bookingSlot.slotId}`
    });
  }
  
  // If booking ends before working slot ends, create a slot after booking
  if (bookEnd.isBefore(workEnd)) {
    result.push({
      ...workingSlot,
      startTime: bookEnd.format("HH:mm"),
      slotId: `${workingSlot.slotId}_after_${bookingSlot.slotId}`
    });
  }
  
  return result;
}

// Function to split available slots into duration-based time slots
function splitSlotByDuration(slot: any, durationMinutes: number): IBookingSlot[] {
    const result: IBookingSlot[] = [];
    const slotStart = dayjs(`${slot.day} ${slot.startTime}`, "YYYY-MM-DD HH:mm");
    const slotEnd = dayjs(`${slot.day} ${slot.endTime}`, "YYYY-MM-DD HH:mm");
    
    let currentStart = slotStart;
    
    while (currentStart.add(durationMinutes, 'minute').isSameOrBefore(slotEnd)) {
        const currentEnd = currentStart.add(durationMinutes, 'minute');
        
        result.push({
            serviceId: '', // Will be set later
            day: slot.day,
            startTime: currentStart.format("HH:mm"),
            endTime: currentEnd.format("HH:mm")
        });
        
        currentStart = currentEnd;
    }
    
    return result;
}
async function mapToMuaResponse(ele:any):Promise<MuaResponseDTO>{
    return{
        _id:ele._id,
        userId:ele.userId?._id?.toString() || '',
        userName:ele.userId?.fullName?.toString()||'',
        avatarUrl:ele.userId?.avatarUrl?.toString()||'',
        experienceYears:ele.experienceYears || 0,
        bio:ele.bio,
        location:ele.location,
        ratingAverage:ele.ratingAverage,
        status:ele.status,
        feedbackCount:ele.feedbackCount,
        bookingCount:ele.bookingCount,
    }
}

async function getAvailableSlotsOfMuaByDay(muaId:string,day:string):Promise<ISlot[]>{
    // Get final slots (includes working and booking slots)
    const weekStart = getMondayOfWeek(day,"YYYY-MM-DD"); // Monday of the week
    const finalSlotsData = await getFinalSlots(muaId, weekStart);
    const finalSlots = finalSlotsData.slots;
    
    // Filter working slots for the specific day
    const workingTypes = [SLOT_TYPES.ORIGINAL_WORKING, SLOT_TYPES.OVERRIDE, SLOT_TYPES.NEW_WORKING, SLOT_TYPES.NEW_OVERRIDE];
    const workingsOfDay = finalSlots.filter(slot => 
        slot.day === fromUTC(day).format("YYYY-MM-DD") && 
        workingTypes.includes(slot.type as any)
    );
    
    // Filter booking slots for the specific day
    const bookingsOfDay = finalSlots.filter(slot => 
        slot.day === fromUTC(day).format("YYYY-MM-DD") && 
        slot.type === SLOT_TYPES.BOOKING
    );
    
    // Calculate available slots by removing booked time from working slots
    let availableSlots: ISlot[] = [...workingsOfDay];
    
    for (const booking of bookingsOfDay) {
        const newAvailableSlots: ISlot[] = [];
        
        for (const workingSlot of availableSlots) {
            const remainingSlots = subtractBookedFromWorking(workingSlot, booking);
            newAvailableSlots.push(...remainingSlots);
        }
        
        availableSlots = newAvailableSlots;
    }
    
    // Filter out slots with invalid time ranges (startTime >= endTime)
    const validAvailableSlots = availableSlots.filter(slot => {
        const start = dayjs(`${slot.day} ${slot.startTime}`, "YYYY-MM-DD HH:mm");
        const end = dayjs(`${slot.day} ${slot.endTime}`, "YYYY-MM-DD HH:mm");
        return start.isBefore(end);
    });
    return validAvailableSlots;
}
async function getAvailableServicesOfMuaByDay(muaId:string,day:string):Promise<ServiceResponseDTO[]>{
    // Get final slots (includes working and booking slots)
    const weekStart = getMondayOfWeek(day,"YYYY-MM-DD"); // Monday of the week
    const finalSlotsData = await getFinalSlots(muaId, weekStart);
    const finalSlots = finalSlotsData.slots;
    
    // Filter working slots for the specific day
    const workingTypes = [SLOT_TYPES.ORIGINAL_WORKING, SLOT_TYPES.OVERRIDE, SLOT_TYPES.NEW_WORKING, SLOT_TYPES.NEW_OVERRIDE];
    const workingsOfDay = finalSlots.filter(slot => 
        slot.day === fromUTC(day).format("YYYY-MM-DD") && 
        workingTypes.includes(slot.type as any)
    );
    
    // Filter booking slots for the specific day
    const bookingsOfDay = finalSlots.filter(slot => 
        slot.day === fromUTC(day).format("YYYY-MM-DD") && 
        slot.type === SLOT_TYPES.BOOKING
    );
    
    // Calculate available slots by removing booked time from working slots
    let availableSlots: ISlot[] = [...workingsOfDay];
    
    for (const booking of bookingsOfDay) {
        const newAvailableSlots: ISlot[] = [];
        
        for (const workingSlot of availableSlots) {
            const remainingSlots = subtractBookedFromWorking(workingSlot, booking);
            newAvailableSlots.push(...remainingSlots);
        }
        
        availableSlots = newAvailableSlots;
    }
    
    // Filter out slots with invalid time ranges (startTime >= endTime)
    const validAvailableSlots = availableSlots.filter(slot => {
        const start = dayjs(`${slot.day} ${slot.startTime}`, "YYYY-MM-DD HH:mm");
        const end = dayjs(`${slot.day} ${slot.endTime}`, "YYYY-MM-DD HH:mm");
        return start.isBefore(end);
    });
    
    const services = await ServicePackage.find({ muaId: new mongoose.Types.ObjectId(muaId), isAvailable: { $ne: false } })
    .select("_id muaId name description price duration imageUrl isAvailable createdAt updatedAt")
    .sort({ price: 1 })
    .lean();
 
    const validAvailableServices = services.filter(service => {
        // Skip services without duration
        if (!service.duration) return false;
        
        // Check if this service's duration can fit in any available slot
        return validAvailableSlots.some(slot => {
            const slotStart = dayjs(`${slot.day} ${slot.startTime}`, "YYYY-MM-DD HH:mm");
            const slotEnd = dayjs(`${slot.day} ${slot.endTime}`, "YYYY-MM-DD HH:mm");
            const slotDurationMinutes = slotEnd.diff(slotStart, 'minute');
            
            // Service can be performed if its duration fits within the slot
            return service.duration! <= slotDurationMinutes;
        });
    });

    return validAvailableServices.map((service) => ({
        _id: service._id.toString(),
        muaId: service.muaId?._id.toString() || '',
        name: service.name || '',
        description: service.description || '',
        price: service.price || 0,
        duration: service.duration || 0,
        imageUrl: service.imageUrl || '',
        isActive: service.isAvailable !== false,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt
    }));
}
export async function getAvailableSlotsOfService(muaId: string, serviceId: string, day: string, durationMinutes: number): Promise<IBookingSlot[]> {
    // Filter out slots with invalid time ranges (startTime >= endTime)
    const validAvailableSlots = await getAvailableSlotsOfMuaByDay(muaId,day);
    
    // Split each available slot into duration-based time slots
    const durationBasedSlots: IBookingSlot[] = [];
    
    for (const slot of validAvailableSlots) {
        const splitSlots = splitSlotByDuration(slot, durationMinutes);
        durationBasedSlots.push(...splitSlots);
    }
    
    // Set serviceId for all slots and return
    return durationBasedSlots.map(slot => ({
        ...slot,
        serviceId
    }));
}

export async function getAvailableMonthlySlots(muaId: string, day: string, durationMinutes: number): Promise<Record<string, [string, string, string][]>> {
    // Determine month range based on provided day
    const base = dayjs(day);
    if (!base.isValid()) {
        throw new Error("Invalid day provided for monthly availability");
    }
    const daysInMonth = base.daysInMonth();
    const monthYear = base.year();
    const monthIndex = base.month(); // 0-based

    const result: Record<string, [string, string, string][]> = {};
    const weekCache = new Map<string, ISlot[]>();

    // Working slot types
    const workingTypes = [SLOT_TYPES.ORIGINAL_WORKING, SLOT_TYPES.OVERRIDE, SLOT_TYPES.NEW_WORKING, SLOT_TYPES.NEW_OVERRIDE];

    // Helper to get (and cache) final slots for a week
    async function getWeekSlots(targetDayISO: string): Promise<ISlot[]> {
        const weekStart = getMondayOfWeek(targetDayISO, "YYYY-MM-DD");
        if (weekCache.has(weekStart)) return weekCache.get(weekStart)!;
        const finalSlotsData = await getFinalSlots(muaId, weekStart);
        weekCache.set(weekStart, finalSlotsData.slots);
        return finalSlotsData.slots;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const currentDay = dayjs(new Date(monthYear, monthIndex, i)).format("YYYY-MM-DD");
        let finalSlots: ISlot[];
        try {
            finalSlots = await getWeekSlots(currentDay);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`Monthly availability week load failed for ${currentDay}:`, e);
            continue;
        }
        const targetDay = fromUTC(currentDay).format("YYYY-MM-DD");

        const workingsOfDay = finalSlots.filter(slot => slot.day === targetDay && workingTypes.includes(slot.type as any));
        const bookingsOfDay = finalSlots.filter(slot => slot.day === targetDay && slot.type === SLOT_TYPES.BOOKING);

        // Start from all working slots
        let availableSlots: ISlot[] = [...workingsOfDay];
        for (const booking of bookingsOfDay) {
            const newAvailable: ISlot[] = [];
            for (const workingSlot of availableSlots) {
                const rem = subtractBookedFromWorking(workingSlot, booking);
                newAvailable.push(...rem);
            }
            availableSlots = newAvailable;
        }

        // Validate ranges
        const validAvailable = availableSlots.filter(slot => {
            const start = dayjs(`${slot.day} ${slot.startTime}`, "YYYY-MM-DD HH:mm");
            const end = dayjs(`${slot.day} ${slot.endTime}`, "YYYY-MM-DD HH:mm");
            return start.isBefore(end);
        });

        const durationBased: IBookingSlot[] = [];
        for (const s of validAvailable) {
            durationBased.push(...splitSlotByDuration(s, durationMinutes));
        }

        if (durationBased.length) {
            const tuples: [string, string, string][] = durationBased.map(s => [
                s.day,
                s.startTime,
                dayjs(`${s.day} ${s.startTime}`, "YYYY-MM-DD HH:mm").add(durationMinutes, 'minute').format("HH:mm")
            ]);
            result[currentDay] = tuples;
        }
    }

    return result;
}

export async function getAvailableMuaServicesByDay(day:string):Promise<IAvailableMuaServices[]>{
    const muaIds = await MUA.find({ status: MUA_STATUS.APPROVED }).populate('userId', '_id fullName').exec();
    const result = await Promise.all(muaIds.map(async (element:any) => {
        const validAvailableSlots = await getAvailableServicesOfMuaByDay(element._id,day);
        if(!validAvailableSlots.length) return null;
        return {
            day,
            mua: await mapToMuaResponse(element),
            services: validAvailableSlots
        } as IAvailableMuaServices;
    }));
    return result.filter((item): item is IAvailableMuaServices => item !== null);
}

// ==================== OVERLAP CHECKING FUNCTIONS ====================

// Helper function to check if two bookings overlap
function checkBookingOverlap(
    booking1Start: Date,
    booking1End: Date,
    booking2Start: Date,
    booking2End: Date
): boolean {
    return booking1Start < booking2End && booking2Start < booking1End;
}

// Check if a new booking overlaps with existing bookings for the same MUA
async function checkBookingConflict(
    muaId: string,
    bookingDate: Date,
    duration: number,
    excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflictingBooking?: any }> {
    try {
        const bookingStart = dayjs(bookingDate);
        const bookingEnd = bookingStart.add(duration, 'minute');
        
        // Get the start and end of the booking day
        const dayStart = bookingStart.startOf('day').toDate();
        const dayEnd = bookingStart.endOf('day').toDate();

        console.log("booking start" + bookingStart.toDate());
        console.log("booking end" + bookingEnd.toDate());
        console.log("day start" + dayStart);
        console.log("day end" + dayEnd);
        // Find existing bookings for the same MUA on the same day
        const filter: any = {
            muaId,
            bookingDate: {
                $gte: dayStart,
                $lte: dayEnd
            },
            status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] } // Exclude cancelled bookings
        };

        // Exclude current booking if updating
        if (excludeBookingId) {
            filter._id = { $ne: excludeBookingId };
        }

        const existingBookings = await Booking.find(filter).exec();

        // Check for overlaps
        for (const existingBooking of existingBookings) {
            const existingStart = dayjs(existingBooking.bookingDate);
            const existingEnd = existingStart.add(existingBooking.duration || 0, 'minute');
            console.log("existing start" + existingStart.toDate());
            console.log("existing end " + existingEnd.toDate());
            if (checkBookingOverlap(
                bookingStart.toDate(),
                bookingEnd.toDate(),
                existingStart.toDate(),
                existingEnd.toDate()
            )) {
                return {
                    hasConflict: true,
                    conflictingBooking: {
                        id: existingBooking._id,
                        startTime: existingStart.format('HH:mm'),
                        endTime: existingEnd.format('HH:mm'),
                        date: existingStart.format('YYYY-MM-DD')
                    }
                };
            }
        }

        return { hasConflict: false };
    } catch (error) {
        throw new Error(`Failed to check booking conflict: ${error}`);
    }
}

// ==================== CRUD FUNCTIONS ====================

// CREATE - Tạo booking mới
export async function createBooking(bookingData: CreateBookingDTO): Promise<BookingResponseDTO> {
    try {
        // Check for booking conflicts before creating
        const conflictCheck = await checkBookingConflict(
            bookingData.muaId,
            bookingData.bookingDate,
            bookingData.duration
        );

        if (conflictCheck.hasConflict) {
            throw new Error(
                `Booking conflict detected. There is already a booking from ${conflictCheck.conflictingBooking?.startTime} to ${conflictCheck.conflictingBooking?.endTime} on ${conflictCheck.conflictingBooking?.date}`
            );
        }

        const booking = new Booking({
            ...bookingData,
            status: BOOKING_STATUS.PENDING,
            createdAt: new Date()
        });

        const savedBooking = await booking.save();

        const customer = await mongoose.model('User').findById(bookingData.customerId).exec();
        if (!customer) {
            throw new Error("Customer not found");
        }
        customer.phoneNumber = bookingData.customerPhone;
        await customer.save();
        
        // Populate để lấy thông tin customer và service
        const populatedBooking = await Booking.findById(savedBooking._id)
            .populate("customerId serviceId")
            .exec();

        if (!populatedBooking) {
            throw new Error("Failed to retrieve created booking");
        }
        await invalidateWeeklyCache(bookingData.muaId, bookingData.bookingDate);
        return formatBookingResponse(populatedBooking);
    } catch (error) {
        throw new Error(`Failed to create booking: ${error}`);
    }
}
export async function createRedisPendingBooking(bookingData: CreateBookingDTO): Promise<null | PendingBookingResponseDTO> {
    try {
        // Check for booking conflicts before creating
        console.log("booking date in create redis pending booking: " + bookingData.bookingDate);
        const conflictCheck = await checkBookingConflict(
            bookingData.muaId,
            bookingData.bookingDate,
            bookingData.duration
        );
        if (conflictCheck.hasConflict) {
            throw new Error(
                `Booking conflict detected. There is already a booking from ${conflictCheck.conflictingBooking?.startTime} to ${conflictCheck.conflictingBooking?.endTime} on ${conflictCheck.conflictingBooking?.date}`
            );
        }
        const booking = new Booking({
            ...bookingData,
            status: BOOKING_STATUS.PENDING,
            createdAt: new Date()
        });
        const orderCode = generateOrderCode();
        const pendingBooking: PendingBookingResponseDTO = {
            ...formatBookingResponse(booking),
            customerPhone: bookingData.customerPhone,
            orderCode,
        };

        const cacheKey = `booking:pending:${orderCode}`;
        await redisClient.json.set(cacheKey, '.', JSON.parse(JSON.stringify(pendingBooking)));
        await redisClient.expire(cacheKey, 1800);
        return pendingBooking;
    } catch (error) {
        throw new Error(`Failed to create booking: ${error}`);
    }
}

export async function getRedisPendingBooking(orderCode: number): Promise<PendingBookingResponseDTO | null> {
    try {
        const cacheKey = `booking:pending:${orderCode}`;
        return await redisClient.json.get(cacheKey) as PendingBookingResponseDTO | null;
    } catch (error) {
        throw new Error(`Failed to get booking: ${error}`);
    }
}
export async function deleteRedisPendingBooking(orderCode: number): Promise<void> {
    try {
        const cacheKey = `booking:pending:${orderCode}`;
        await redisClient.del(cacheKey);
    } catch (error) {
        throw new Error(`Failed to delete pending booking: ${error}`);
    }
}
// READ - Lấy booking theo ID
export async function getBookingById(bookingId: string): Promise<BookingResponseDTO | null> {
    try {
        const booking = await Booking.findById(bookingId)
            .populate("customerId serviceId")
            .exec();

        if (!booking) {
            return null;
        }

        return formatBookingResponse(booking);
    } catch (error) {
        throw new Error(`Failed to get booking: ${error}`);
    }
}

// READ - Lấy tất cả bookings với phân trang
export async function getAllBookings(
    page: number = 1, 
    pageSize: number = 10,
    status?: string
): Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }> {
    try {
        const skip = (page - 1) * pageSize;
        const filter: any = {};
        
        if (status) {
            filter.status = status;
        }

        const [bookings, total] = await Promise.all([
            Booking.find(filter)
                .populate("customerId serviceId")
                .skip(skip)
                .limit(pageSize)
                .sort({ createdAt: -1 })
                .exec(),
            Booking.countDocuments(filter)
        ]);

        const formattedBookings = bookings.map(booking => formatBookingResponse(booking));

        return {
            bookings: formattedBookings,
            total,
            page,
            totalPages: Math.ceil(total / pageSize)
        };
    } catch (error) {
        throw new Error(`Failed to get bookings: ${error}`);
    }
}

// READ - Lấy bookings theo customer ID
export async function getBookingsByCustomer(
    customerId: string,
    page: number = 1,
    pageSize: number = 10
): Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }> {
    try {
        const skip = (page - 1) * pageSize;

        const [bookings, total] = await Promise.all([
            Booking.find({ customerId })
                .populate("customerId serviceId")
                .skip(skip)
                .limit(pageSize)
                .sort({ bookingDate: -1 })
                .exec(),
            Booking.countDocuments({ customerId })
        ]);

        const formattedBookings = bookings.map(booking => formatBookingResponse(booking));

        return {
            bookings: formattedBookings,
            total,
            page,
            totalPages: Math.ceil(total / pageSize)
        };
    } catch (error) {
        throw new Error(`Failed to get customer bookings: ${error}`);
    }
}

// READ - Lấy bookings theo MUA ID
export async function getBookingsByMUA(
    muaId: string,
    page: number = 1,
    pageSize: number = 10
): Promise<{ bookings: BookingResponseDTO[], total: number, page: number, totalPages: number }> {
    try {
        const skip = (page - 1) * pageSize;

        const [bookings, total] = await Promise.all([
            Booking.find({ muaId })
                .populate("customerId serviceId")
                .skip(skip)
                .limit(pageSize)
                .sort({ bookingDate: -1 })
                .exec(),
            Booking.countDocuments({ muaId })
        ]);

        const formattedBookings = bookings.map(booking => formatBookingResponse(booking));

        return {
            bookings: formattedBookings,
            total,
            page,
            totalPages: Math.ceil(total / pageSize)
        };
    } catch (error) {
        throw new Error(`Failed to get MUA bookings: ${error}`);
    }
}

// READ - Lấy bookings theo ngày
export async function getBookingsByDate(
    date: string,
    muaId?: string
): Promise<BookingResponseDTO[]> {
    try {
        const startOfDay = dayjs(date).startOf('day').toDate();
        const endOfDay = dayjs(date).endOf('day').toDate();

        const filter: any = {
            bookingDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };

        if (muaId) {
            filter.muaId = muaId;
        }

        const bookings = await Booking.find(filter)
            .populate("customerId serviceId")
            .sort({ bookingDate: 1 })
            .exec();

        return bookings.map(booking => formatBookingResponse(booking));
    } catch (error) {
        throw new Error(`Failed to get bookings by date: ${error}`);
    }
}

// UPDATE - Cập nhật booking
export async function updateBooking(
    bookingId: string, 
    updateData: UpdateBookingDTO
): Promise<BookingResponseDTO | null> {
    try {
        // Get current booking to check if time/date is being updated
        const currentBooking = await Booking.findById(bookingId).exec();
        if (!currentBooking) {
            return null;
        }

        // Check for conflicts if booking date, duration, or muaId is being updated
        if (updateData.bookingDate || updateData.duration || updateData.muaId) {
            const newMuaId = updateData.muaId || currentBooking.muaId;
            const newBookingDate = updateData.bookingDate || currentBooking.bookingDate;
            const newDuration = updateData.duration || currentBooking.duration || 0;

            // Type guards to ensure required values are present
            if (!newMuaId || !newBookingDate || typeof newDuration !== 'number') {
                throw new Error('Missing required booking data for conflict check');
            }

            const conflictCheck = await checkBookingConflict(
                newMuaId.toString(),
                newBookingDate,
                newDuration,
                bookingId // Exclude current booking from conflict check
            );

            if (conflictCheck.hasConflict) {
                throw new Error(
                    `Booking conflict detected. There is already a booking from ${conflictCheck.conflictingBooking?.startTime} to ${conflictCheck.conflictingBooking?.endTime} on ${conflictCheck.conflictingBooking?.date}`
                );
            }
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate("customerId serviceId").exec();

        if (!updatedBooking) {
            return null;
        }

        return formatBookingResponse(updatedBooking);
    } catch (error) {
        throw new Error(`Failed to update booking: ${error}`);
    }
}

// UPDATE - Cập nhật status booking
export async function updateBookingStatus(
    bookingId: string, 
    status: string
): Promise<BookingResponseDTO | null> {
    try {
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { status, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate("customerId serviceId").exec();

        if (!updatedBooking) {
            return null;
        }
        // Invalidate weekly cache for the MUA and week of this booking whenever status changes
        try {
            const muaId = updatedBooking.muaId?.toString?.();
            const bookingDate: Date | undefined = updatedBooking.bookingDate as any;
            if (muaId && bookingDate) {
                await invalidateWeeklyCache(muaId, bookingDate);
            }

            //update transaction and wallet
            const transaction = await mongoose.model('Transaction').findOne({ bookingId: bookingId }).exec();
            if (transaction) {
                const Wallet = mongoose.model('Wallet');
                if (status === BOOKING_STATUS.CONFIRMED) {
                    transaction.status = TRANSACTION_STATUS.CAPTURED;
                    await transaction.save();
                    const muaWallet = await Wallet.findOne({ muaId: updatedBooking.muaId }).exec();
                    if (muaWallet) {
                        muaWallet.balance += transaction.amount;
                        await muaWallet.save();
                    }
                }
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Failed to invalidate weekly cache after status update:', e);
        }
        return formatBookingResponse(updatedBooking);
    } catch (error) {
        throw new Error(`Failed to update booking status: ${error}`);
    }
}

// DELETE - Xóa booking (soft delete bằng cách đổi status thành CANCELLED)
export async function cancelBooking(bookingId: string): Promise<BookingResponseDTO | null> {
    try {
        const cancelledBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { 
                status: BOOKING_STATUS.CANCELLED,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate("customerId serviceId").exec();

        if (!cancelledBooking) {
            return null;
        }

        return formatBookingResponse(cancelledBooking);
    } catch (error) {
        throw new Error(`Failed to cancel booking: ${error}`);
    }
}

// DELETE - Xóa booking hoàn toàn (hard delete)
export async function deleteBooking(bookingId: string): Promise<boolean> {
    try {
        const result = await Booking.findByIdAndDelete(bookingId).exec();
        return result !== null;
    } catch (error) {
        throw new Error(`Failed to delete booking: ${error}`);
    }
}

// UTILITY - Format booking response
export function formatBookingResponse(booking: any): BookingResponseDTO {
    const rawDate = booking.bookingDate;
    const bookingDay = rawDate ? fromUTC(rawDate) : dayjs();
    const durationVal: number = typeof booking.duration === 'number' ? booking.duration : 0;
    const customer = booking.customerId || {};
    const service = booking.serviceId || {};
    const mua = booking.muaId || {};

    return {
        _id: booking._id ? String(booking._id) : '',
        customerId: customer._id ? String(customer._id) : '',
        artistId: mua._id ? String(mua._id) : '',
        serviceId: service._id ? String(service._id) : '',
        customerName: customer.fullName || "",
        customerPhone: booking.customerPhone || "",
        serviceName: service.name || "",
        servicePrice: service.price || 0,
        bookingDate: bookingDay.format("YYYY-MM-DD"),
        startTime: bookingDay.format("HH:mm"),
        endTime: bookingDay.add(durationVal, 'minute').format("HH:mm"),
        duration: durationVal,
        locationType: booking.locationType || BOOKING_TYPES.STUDIO,
        address: booking.address || '',
        status: booking.status || BOOKING_STATUS.PENDING,
        transportFee: booking.transportFee,
        totalPrice: booking.totalPrice || 0,
        note: booking.note,
        createdAt: booking.createdAt || new Date(),
        updatedAt: booking.updatedAt || booking.createdAt || new Date()
    };
}

// ==================== MARK COMPLETED ====================
export async function markBookingCompleted(bookingId: string, muaIdFromReq: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        const err: any = { status: 404, code: "booking_not_found", message: "Booking not found" };
        throw err;
    }
    if (!muaIdFromReq || !mongoose.Types.ObjectId.isValid(muaIdFromReq)) {
        const err: any = { status: 401, code: "unauthorized", message: "Unauthorized" };
        throw err;
    }

    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
        const err: any = { status: 404, code: "booking_not_found", message: "Booking not found" };
        throw err;
    }

    // Ownership check
    const ownerMuaId = booking.muaId?.toString?.();
    if (!ownerMuaId || ownerMuaId !== muaIdFromReq) {
        const err: any = { status: 403, code: "not_owner", message: "You are not the owner of this booking" };
        throw err;
    }

    // Status check
    if (booking.status !== BOOKING_STATUS_CONST.CONFIRMED) {
        const err: any = { status: 409, code: "invalid_status", message: "Only CONFIRMED bookings can be completed" };
        throw err;
    }

    // Time check (bookingDate + duration must be in the past)
    const ended = hasBookingEnded({ bookingDate: booking.bookingDate as Date, duration: booking.duration as number });
    if (!ended) {
        const err: any = { status: 422, code: "too_early", message: "Booking has not ended yet" };
        throw err;
    }

    // Update to COMPLETED with completedAt timestamp
    const now = new Date();
    const updated = await Booking.findByIdAndUpdate(
        bookingId,
        { status: BOOKING_STATUS_CONST.COMPLETED, completedAt: now, updatedAt: now },
        { new: true, runValidators: true }
    ).exec();

    if (!updated) {
        const err: any = { status: 500, code: "internal_error", message: "Failed to update booking" };
        throw err;
    }

    return {
        _id: updated._id.toString(),
        status: updated.status,
        completedAt: updated.completedAt
    };
}