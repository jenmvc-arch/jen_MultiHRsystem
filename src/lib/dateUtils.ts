/**
 * Date and Time utilities for GMT+8 (Kuala Lumpur) timezone.
 */

export function getGmt8DateString(): string {
  // Returns 'YYYY-MM-DD' formatted for Asia/Kuala_Lumpur
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

export function getGmt8Timestamp(): string {
  // Returns ISO-8601 string 'YYYY-MM-DDTHH:mm:ss.sss+08:00' for Asia/Kuala_Lumpur
  const d = new Date();
  const tzOffset = 480; // GMT+8 in minutes
  const localTime = d.getTime() + (d.getTimezoneOffset() + tzOffset) * 60000;
  const localDate = new Date(localTime);
  const iso = localDate.toISOString();
  return iso.replace('Z', '+08:00');
}

export function getGmt8LongDateString(): string {
  // Returns 'Month Day, Year' formatted for Asia/Kuala_Lumpur
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatToDDMMMYYYY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      // If it's already in DD-MMM-YYYY format, return it
      if (typeof dateInput === 'string' && /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateInput)) {
        return dateInput;
      }
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateInput);
  }
}
