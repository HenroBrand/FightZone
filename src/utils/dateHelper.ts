/**
 * Safely converts timestamps to South Africa Standard Time (SAST = UTC+2)
 * Output Format required: "Saturday, 21 June 2026 • 03:00 SAST"
 */
export function formatToSAST(dateInput: Date | string | number): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' 
    ? new Date(dateInput) 
    : dateInput;
    
  if (!d || isNaN(d.getTime())) return "TBD";

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  try {
    // Use Intl.DateTimeFormat to force 'Africa/Johannesburg' (UTC+2) translation
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(d);
    const p: { [key: string]: string } = {};
    parts.forEach(({ type, value }) => {
      p[type] = value;
    });

    const cleanWeekday = p.weekday || days[d.getUTCDay()];
    const cleanDay = p.day || String(d.getUTCDate());
    const cleanMonth = p.month || months[d.getUTCMonth()];
    const cleanYear = p.year || String(d.getUTCFullYear());
    const cleanHour = p.hour || String(d.getUTCHours()).padStart(2, '0');
    const cleanMinute = p.minute || String(d.getUTCMinutes()).padStart(2, '0');

    return `${cleanWeekday}, ${cleanDay} ${cleanMonth} ${cleanYear} • ${cleanHour}:${cleanMinute} SAST`;
  } catch (err) {
    // Defensive manual fallback (UTC+2) if Intl timeZone is unsupported
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const sastTime = new Date(utcTime + (2 * 3600000));

    const dayName = days[sastTime.getDay()];
    const dateNum = sastTime.getDate();
    const monthName = months[sastTime.getMonth()];
    const yearNum = sastTime.getFullYear();
    const hours = String(sastTime.getHours()).padStart(2, '0');
    const minutes = String(sastTime.getMinutes()).padStart(2, '0');

    return `${dayName}, ${dateNum} ${monthName} ${yearNum} • ${hours}:${minutes} SAST`;
  }
}

/**
 * Returns year and month keys for calendar rendering based on SAST timezone
 */
export function getCalendarContext(date: Date) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    const p: { [key: string]: string } = {};
    parts.forEach(({ type, value }) => {
      p[type] = value;
    });
    return {
      year: parseInt(p.year),
      month: parseInt(p.month) - 1, // 0-indexed
      day: parseInt(p.day)
    };
  } catch (e) {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate()
    };
  }
}
