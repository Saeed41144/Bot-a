/**
 * Persian Date, Jalali-Gregorian conversion, and Number formatting utilities
 */
import { TaskRecurrence, Language } from '../types';

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const PERSIAN_WEEKDAY_NAMES = [
  { key: 6, label: 'شنبه', short: 'ش' },
  { key: 0, label: 'یک‌شنبه', short: 'ی' },
  { key: 1, label: 'دوشنبه', short: 'د' },
  { key: 2, label: 'سه‌شنبه', short: 'س' },
  { key: 3, label: 'چهارشنبه', short: 'چ' },
  { key: 4, label: 'پنج‌شنبه', short: 'پ' },
  { key: 5, label: 'جمعه', short: 'ج' },
];

export function toPersianDigits(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '۰';
  if (typeof num === 'number' && (isNaN(num) || !isFinite(num))) return '۰';
  if (typeof num === 'string') {
    const trimmed = num.trim();
    if (
      trimmed === '' ||
      trimmed.toLowerCase() === 'nan' ||
      trimmed.toLowerCase() === 'undefined' ||
      trimmed.toLowerCase() === 'null'
    ) {
      return '۰';
    }
  }
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, (w) => farsiDigits[+w]);
}

/**
 * Standard Jalali (Shamsi) to Gregorian Converter
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  jy += 1595;
  let days = -355668 + (365 * jy) + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd;
  if (jm < 7) {
    days += (jm - 1) * 31;
  } else {
    days += ((jm - 7) * 30) + 186;
  }
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && days >= sal_a[gm]) {
    days -= sal_a[gm];
    gm++;
  }
  let gd = days + 1;
  return { gy, gm, gd };
}

/**
 * Standard Gregorian to Jalali (Shamsi) Converter
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Convert Jalali components to YYYY-MM-DD Gregorian string
 */
export function jalaliToDateString(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const mStr = String(gm).padStart(2, '0');
  const dStr = String(gd).padStart(2, '0');
  return `${gy}-${mStr}-${dStr}`;
}

/**
 * Convert Gregorian YYYY-MM-DD string to Jalali components
 */
export function dateStringToJalali(dateStr: string): { jy: number; jm: number; jd: number } {
  try {
    const [gy, gm, gd] = dateStr.split('-').map(Number);
    return gregorianToJalali(gy, gm, gd);
  } catch {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
}

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add N days to date string
 */
export function addDaysToDate(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return getTodayString();
  }
}

/**
 * Add N months to date string
 */
export function addMonthsToDate(dateStr: string, months: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + months);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return getTodayString();
  }
}

/**
 * Format date string into Persian text e.g. "پنج‌شنبه ۱۵ شهریور ۱۴۰۳"
 */
export function formatDateStringToPersian(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('fa-IR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Format date string into short Persian e.g. "۱۴۰۳/۰۶/۱۵"
 */
export function formatDateStringToPersianShort(dateStr: string): string {
  try {
    const { jy, jm, jd } = dateStringToJalali(dateStr);
    const m = String(jm).padStart(2, '0');
    const d = String(jd).padStart(2, '0');
    return toPersianDigits(`${jy}/${m}/${d}`);
  } catch {
    return dateStr;
  }
}

/**
 * Relative Due Date description e.g. "امروز", "فردا", "پس‌فردا", "۳ روز مانده", "۲ روز گذشته"
 */
export function getRelativeDueDateInfo(dateStr?: string, todayStr: string = getTodayString()): {
  label: string;
  isToday: boolean;
  isTomorrow: boolean;
  isOverdue: boolean;
  daysDiff: number;
  overdueDays: number;
} {
  if (!dateStr) {
    return {
      label: 'بدون موعد',
      isToday: false,
      isTomorrow: false,
      isOverdue: false,
      daysDiff: 0,
      overdueDays: 0,
    };
  }

  const [y1, m1, d1] = dateStr.split('-').map(Number);
  const [y2, m2, d2] = todayStr.split('-').map(Number);

  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.round((t1 - t2) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'امروز', isToday: true, isTomorrow: false, isOverdue: false, daysDiff: 0, overdueDays: 0 };
  } else if (diffDays === 1) {
    return { label: 'فردا', isToday: false, isTomorrow: true, isOverdue: false, daysDiff: 1, overdueDays: 0 };
  } else if (diffDays === 2) {
    return { label: 'پس‌فردا', isToday: false, isTomorrow: false, isOverdue: false, daysDiff: 2, overdueDays: 0 };
  } else if (diffDays > 2 && diffDays <= 7) {
    return { label: `${toPersianDigits(diffDays)} روز دیگر`, isToday: false, isTomorrow: false, isOverdue: false, daysDiff: diffDays, overdueDays: 0 };
  } else if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: overdueDays === 1 ? 'دیروز (به تعویق افتاده)' : `${toPersianDigits(overdueDays)} روز عقب‌افتاده`,
      isToday: false,
      isTomorrow: false,
      isOverdue: true,
      daysDiff: diffDays,
      overdueDays,
    };
  }

  return {
    label: formatDateStringToPersianShort(dateStr),
    isToday: false,
    isTomorrow: false,
    isOverdue: false,
    daysDiff: diffDays,
    overdueDays: 0,
  };
}

/**
 * Calculates accurate overdue days and descriptive status for a task
 */
export function getTaskOverdueInfo(
  task: { completed?: boolean; dueDate?: string; createdAt?: string },
  todayStr: string = getTodayString()
): {
  isOverdue: boolean;
  overdueDays: number;
  statusLabel: string;
} {
  if (task.completed) {
    return { isOverdue: false, overdueDays: 0, statusLabel: 'انجام‌شده' };
  }

  if (task.dueDate && task.dueDate < todayStr) {
    const [y1, m1, d1] = task.dueDate.split('-').map(Number);
    const [y2, m2, d2] = todayStr.split('-').map(Number);
    const t1 = new Date(y1, m1 - 1, d1).getTime();
    const t2 = new Date(y2, m2 - 1, d2).getTime();
    const diffDays = Math.max(1, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
    return {
      isOverdue: true,
      overdueDays: diffDays,
      statusLabel: `${toPersianDigits(diffDays)} روز عقب‌افتاده`,
    };
  }

  return { isOverdue: false, overdueDays: 0, statusLabel: 'در جریان' };
}

/**
 * Calculate the next recurring due date when completing a task
 */
export function getNextRecurringDate(currentDueDate: string, recurrence?: TaskRecurrence): string {
  if (!recurrence || recurrence.type === 'none') {
    return addDaysToDate(currentDueDate, 1);
  }

  const baseDateStr = currentDueDate || getTodayString();
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const baseDate = new Date(y, m - 1, d);

  switch (recurrence.type) {
    case 'daily': {
      const interval = Math.max(1, recurrence.interval || 1);
      return addDaysToDate(baseDateStr, interval);
    }

    case 'weekdays': {
      // Iran working days: Saturday (6), Sunday (0), Monday (1), Tuesday (2), Wednesday (3), Thursday (4)
      // Next day that is not Friday (5)
      let nextD = new Date(baseDate);
      do {
        nextD.setDate(nextD.getDate() + 1);
      } while (nextD.getDay() === 5); // 5 is Friday
      const ny = nextD.getFullYear();
      const nm = String(nextD.getMonth() + 1).padStart(2, '0');
      const nd = String(nextD.getDate()).padStart(2, '0');
      return `${ny}-${nm}-${nd}`;
    }

    case 'weekly': {
      const daysOfWeek = recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0
        ? recurrence.daysOfWeek
        : [baseDate.getDay()];

      // Find the next day among daysOfWeek
      for (let i = 1; i <= 14; i++) {
        const nextD = new Date(baseDate);
        nextD.setDate(nextD.getDate() + i);
        if (daysOfWeek.includes(nextD.getDay())) {
          const ny = nextD.getFullYear();
          const nm = String(nextD.getMonth() + 1).padStart(2, '0');
          const nd = String(nextD.getDate()).padStart(2, '0');
          return `${ny}-${nm}-${nd}`;
        }
      }
      return addDaysToDate(baseDateStr, 7 * (recurrence.interval || 1));
    }

    case 'monthly': {
      const interval = Math.max(1, recurrence.interval || 1);
      return addMonthsToDate(baseDateStr, interval);
    }

    case 'custom': {
      const interval = Math.max(1, recurrence.interval || 1);
      const unit = recurrence.unit || 'days';
      if (unit === 'days') {
        return addDaysToDate(baseDateStr, interval);
      } else if (unit === 'weeks') {
        return addDaysToDate(baseDateStr, interval * 7);
      } else if (unit === 'months') {
        return addMonthsToDate(baseDateStr, interval);
      }
      return addDaysToDate(baseDateStr, interval);
    }

    default:
      return addDaysToDate(baseDateStr, 1);
  }
}

/**
 * Format Recurrence Rule to friendly readable string
 */
export function getRecurrenceDescription(recurrence?: TaskRecurrence, language: string = 'fa'): string {
  if (!recurrence || recurrence.type === 'none') return '';

  const isFa = language === 'fa';
  const isAr = language === 'ar';

  switch (recurrence.type) {
    case 'daily':
      if (recurrence.interval && recurrence.interval > 1) {
        return isFa ? `هر ${toPersianDigits(recurrence.interval)} روز` : `Every ${recurrence.interval} days`;
      }
      return isFa ? 'روزانه (هر روز)' : isAr ? 'يومياً' : 'Daily';

    case 'weekdays':
      return isFa ? 'روزهای کاری (شنبه تا چهارشنبه)' : isAr ? 'أيام العمل' : 'Weekdays';

    case 'weekly': {
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        const dayNames = recurrence.daysOfWeek
          .map((d) => PERSIAN_WEEKDAY_NAMES.find((w) => w.key === d)?.label || '')
          .filter(Boolean)
          .join('، ');
        return isFa ? `هفتگی (${dayNames})` : `Weekly on ${dayNames}`;
      }
      return isFa ? 'هفتگی (هر هفته)' : isAr ? 'أسبوعياً' : 'Weekly';
    }

    case 'monthly':
      if (recurrence.interval && recurrence.interval > 1) {
        return isFa ? `هر ${toPersianDigits(recurrence.interval)} ماه` : `Every ${recurrence.interval} months`;
      }
      return isFa ? 'ماهانه (هر ماه)' : isAr ? 'شهرياً' : 'Monthly';

    case 'custom': {
      const interval = recurrence.interval || 1;
      const unit = recurrence.unit || 'days';
      const unitLabel = unit === 'days' ? (isFa ? 'روز' : 'days') : unit === 'weeks' ? (isFa ? 'هفته' : 'weeks') : (isFa ? 'ماه' : 'months');
      return isFa ? `هر ${toPersianDigits(interval)} ${unitLabel}` : `Every ${interval} ${unitLabel}`;
    }

    default:
      return '';
  }
}

export function getTodayPersianFull(): {
  weekday: string;
  dayMonthYear: string;
} {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(now);
  const dayMonthYear = new Intl.DateTimeFormat('fa-IR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return { weekday, dayMonthYear };
}

export function getPersianMonthDay(date: Date = new Date()): { month: number; day: number; year: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);

    let year = 1400;
    let month = 1;
    let day = 1;

    for (const part of parts) {
      if (part.type === 'year') year = parseInt(part.value, 10);
      if (part.type === 'month') month = parseInt(part.value, 10);
      if (part.type === 'day') day = parseInt(part.value, 10);
    }
    return { year, month, day };
  } catch {
    const m = date.getMonth(); // 0-indexed (2 is March, 3 is April)
    const d = date.getDate();
    const isFarvardin = (m === 2 && d >= 20) || (m === 3 && d <= 20);
    return { year: 1403, month: isFarvardin ? 1 : 2, day: d };
  }
}

export type PersianSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface PersianSeasonInfo {
  season: PersianSeason;
  seasonNameFa: string;
  seasonNameAr: string;
  seasonNameEn: string;
  seasonIcon: string;
  seasonMonthsFa: string;
  month: number;
  day: number;
  year: number;
}

export function getPersianSeason(date: Date = new Date()): PersianSeasonInfo {
  const { year, month, day } = getPersianMonthDay(date);
  
  if (month >= 1 && month <= 3) {
    return {
      season: 'spring',
      seasonNameFa: 'بهار',
      seasonNameAr: 'الربيع',
      seasonNameEn: 'Spring',
      seasonIcon: '🌸',
      seasonMonthsFa: 'فروردین، اردیبهشت، خرداد',
      month,
      day,
      year,
    };
  } else if (month >= 4 && month <= 6) {
    return {
      season: 'summer',
      seasonNameFa: 'تابستان',
      seasonNameAr: 'الصيف',
      seasonNameEn: 'Summer',
      seasonIcon: '☀️',
      seasonMonthsFa: 'تیر، مرداد، شهریور',
      month,
      day,
      year,
    };
  } else if (month >= 7 && month <= 9) {
    return {
      season: 'autumn',
      seasonNameFa: 'پاییز',
      seasonNameAr: 'الخريف',
      seasonNameEn: 'Autumn',
      seasonIcon: '🍂',
      seasonMonthsFa: 'مهر، آبان، آذر',
      month,
      day,
      year,
    };
  } else {
    return {
      season: 'winter',
      seasonNameFa: 'زمستان',
      seasonNameAr: 'الشتاء',
      seasonNameEn: 'Winter',
      seasonIcon: '❄️',
      seasonMonthsFa: 'دی، بهمن، اسفند',
      month,
      day,
      year,
    };
  }
}

export function getDateSeason(dateStr: string): PersianSeason {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const { month } = getPersianMonthDay(date);
    if (month >= 1 && month <= 3) return 'spring';
    if (month >= 4 && month <= 6) return 'summer';
    if (month >= 7 && month <= 9) return 'autumn';
    return 'winter';
  } catch {
    return 'spring';
  }
}

export function isDateInNowruz(dateStr: string): { isNowruz: boolean; shamsiDay: number; shamsiMonth: number } {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const { month, day } = getPersianMonthDay(date);
    const isNowruz = month === 1 && day >= 1 && day <= 13;
    return { isNowruz, shamsiDay: day, shamsiMonth: month };
  } catch {
    return { isNowruz: false, shamsiDay: 1, shamsiMonth: 1 };
  }
}

export function isDateInYalda(dateStr: string): { isYalda: boolean; isAzarMonth: boolean; shamsiDay: number; shamsiMonth: number } {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const { month, day } = getPersianMonthDay(date);
    const isYalda = (month === 9 && day === 30) || (month === 10 && day === 1);
    const isAzarMonth = month === 9;
    return { isYalda, isAzarMonth, shamsiDay: day, shamsiMonth: month };
  } catch {
    return { isYalda: false, isAzarMonth: false, shamsiDay: 1, shamsiMonth: 1 };
  }
}

export interface WeekMatrixDay {
  dateStr: string;
  weekdayShort: string;
  weekdayFull: string;
  label: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isFriday: boolean;
  jalaliDay: number;
  dayIndex: number;
}

/**
 * Returns the 7 days of the current week, ALWAYS starting from Saturday (شنبه) to Friday (جمعه).
 */
export function getCurrentWeekMatrixDays(referenceDateStr?: string, language: Language = 'fa'): WeekMatrixDay[] {
  const list: WeekMatrixDay[] = [];
  const ref = referenceDateStr ? new Date(referenceDateStr + 'T12:00:00') : new Date();
  const todayStr = getTodayString();
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  const faWeekdaysShort = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  const faWeekdaysFull = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

  const arWeekdaysShort = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
  const arWeekdaysFull = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  const enWeekdaysShort = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const enWeekdaysFull = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const jsDay = ref.getDay(); // 0 is Sun, 6 is Sat
  const daysSinceSaturday = (jsDay + 1) % 7; // Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6

  const saturday = new Date(ref);
  saturday.setDate(ref.getDate() - daysSinceSaturday);

  for (let i = 0; i < 7; i++) {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const weekdayShort = isFa ? faWeekdaysShort[i] : isAr ? arWeekdaysShort[i] : enWeekdaysShort[i];
    const weekdayFull = isFa ? faWeekdaysFull[i] : isAr ? arWeekdaysFull[i] : enWeekdaysFull[i];

    const { jd } = dateStringToJalali(dateStr);
    const dayNumber = isFa ? toPersianDigits(jd) : String(jd);

    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;
    const isFriday = i === 6;

    list.push({
      dateStr,
      weekdayShort,
      weekdayFull,
      label: dayNumber,
      isToday,
      isPast,
      isFuture,
      isFriday,
      jalaliDay: jd,
      dayIndex: i,
    });
  }

  return list;
}

export function getPastNDays(n: number = 7, referenceDateStr?: string, language: Language = 'fa'): { dateStr: string; label: string; weekday: string; isToday: boolean; jalaliDay?: number }[] {
  const list: { dateStr: string; label: string; weekday: string; isToday: boolean; jalaliDay?: number }[] = [];
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const todayStr = getTodayString();
  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const locale = isFa ? 'fa-IR' : isAr ? 'ar-SA' : 'en-US';

  const faWeekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    let weekday = '';
    let dayNumber = '';
    try {
      if (isFa) {
        // In Persian, get day of week where Saturday is 0
        const jsDay = d.getDay(); // 0 is Sun, 1 is Mon, 6 is Sat
        const faIndex = (jsDay + 1) % 7; // Sat -> 0, Sun -> 1, Mon -> 2, ...
        weekday = faWeekdays[faIndex];
      } else {
        weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d);
      }
      dayNumber = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(d);
    } catch {
      weekday = isFa ? faWeekdays[0] : d.toLocaleDateString(locale, { weekday: 'short' });
      dayNumber = String(d.getDate());
    }

    const { jd } = dateStringToJalali(dateStr);

    list.push({
      dateStr,
      label: isFa ? toPersianDigits(jd) : dayNumber,
      weekday,
      isToday: dateStr === todayStr,
      jalaliDay: jd,
    });
  }

  return list;
}
