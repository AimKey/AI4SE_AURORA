import dayjs from 'dayjs';

/**
 * Helper function to get Monday of the current week
 * @param date - Any date object or string
 * @returns Monday date in parameter format
 */
export const getMondayOfWeek = (date: any,format:string): string => {
  const currentDay = dayjs(date);
  const dayOfWeek = currentDay.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days, else go back (dayOfWeek - 1) days
  return currentDay.subtract(daysToSubtract, 'day').startOf('day').format(format);
};

/**
 * Format date for API calls
 */
export const formatDateForAPI = (date: Date | string): string => {
  return dayjs(date).format('YYYY-MM-DDTHH:mm:ss');
};

/**
 * Format time for API calls
 */
export const formatTimeForAPI = (date: Date | string): string => {
  return dayjs(date).format('HH:mm');
};

/**
 * Get weekday name in uppercase
 */
export const getWeekdayName = (date: Date | string): string => {
  return dayjs(date).format('ddd').toUpperCase();
};

