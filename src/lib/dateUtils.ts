import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts various date formats (ISO string, Firestore Timestamp, Date object)
 * into a JavaScript Date object. Returns null if the input is invalid.
 */
export function safeParseDate(dateInput: any): Date | null {
  if (!dateInput) return null;

  // Handle Firestore Timestamp
  if (typeof dateInput.toDate === 'function') {
    return dateInput.toDate();
  }

  // Handle Timestamp-like object { seconds, nanoseconds }
  if (dateInput.seconds !== undefined && dateInput.nanoseconds !== undefined) {
    return new Timestamp(dateInput.seconds, dateInput.nanoseconds).toDate();
  }

  // Handle Date object
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  // Handle string or number
  const date = new Date(dateInput);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Safely formats a date using a fallback string if the date is invalid.
 */
export function safeFormat(dateInput: any, formatFn: (date: Date) => string, fallback: string = 'N/A'): string {
  const date = safeParseDate(dateInput);
  if (!date) return fallback;
  try {
    return formatFn(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallback;
  }
}
