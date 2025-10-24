import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Convert local datetime -> UTC
 */
export function toUTC(date: Date | string, timeZone: string = "Asia/Ho_Chi_Minh") {
  return dayjs.tz(date, timeZone).utc(); 
  // Trả về dayjs object UTC
}

/**
 * Convert UTC datetime -> local timezone
 */
export function fromUTC(date: Date | string, timeZone: string = "Asia/Ho_Chi_Minh") {
  return dayjs.utc(date).tz(timeZone); 
  // Trả về dayjs object local
}

