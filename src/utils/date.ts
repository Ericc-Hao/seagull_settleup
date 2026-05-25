const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DISPLAY_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatMonthYear(date = new Date()): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMonthYearOverview(date = new Date()): string {
  return `${formatMonthYear(date)} Overview`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function isInMonth(isoDate: string, month: Date): boolean {
  const date = new Date(isoDate);
  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
}

export function isInCurrentMonth(isoDate: string, reference = new Date()): boolean {
  return isInMonth(isoDate, reference);
}

export function formatDateForDisplay(date: Date): string {
  return `${DISPLAY_MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateForSupabase(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseSupabaseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isEndDateValid(startDate: string, endDate?: string | null): boolean {
  if (!endDate) {
    return true;
  }
  if (!startDate) {
    return false;
  }
  return parseSupabaseDate(endDate).getTime() >= parseSupabaseDate(startDate).getTime();
}

export function formatRelativeTime(isoDate: string, reference = new Date()): string {
  const date = new Date(isoDate);
  const diffMs = reference.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }
  return formatDateForDisplay(date);
}

export function formatOptionalDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) {
    return 'No dates set';
  }
  const startLabel = formatDateForDisplay(parseSupabaseDate(startDate));
  if (!endDate) {
    return `${startLabel} – Ongoing`;
  }
  return `${startLabel} – ${formatDateForDisplay(parseSupabaseDate(endDate))}`;
}
