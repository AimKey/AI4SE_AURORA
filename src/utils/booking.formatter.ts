import dayjs from 'dayjs';
import { fromUTC } from 'utils/timeUtils';
import { BOOKING_TYPES } from 'constants/index';
import { BOOKING_STATUS } from 'constants/index';

// Keep the formatter isolated so it can be mocked in tests more easily.
export function formatBookingResponse(booking: any) {
  try {
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
  } catch (e) {
    throw new Error('format fail');
  }
}
