import { BOOKING_STATUS } from "./index";
import dayjs from "dayjs";

// Re-export only the needed statuses for clarity in booking completion logic
export { BOOKING_STATUS };

// Get booking end time based on schema fields (bookingDate + duration minutes)
export function getBookingEndTime(booking: { bookingDate?: Date; duration?: number }): Date | null {
  if (!booking?.bookingDate || typeof booking?.duration !== 'number') return null;
  const start = dayjs(booking.bookingDate);
  if (!start.isValid()) return null;
  return start.add(booking.duration, 'minute').toDate();
}

export function hasBookingEnded(booking: { bookingDate?: Date; duration?: number }, now: Date = new Date()): boolean {
  const end = getBookingEndTime(booking);
  if (!end) return false;
  return now.getTime() > end.getTime();
}
