import { CalendarEvent, DayInfo, WeekData, WeekGanttSegment } from "../types";

export const HEBREW_MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר"
];

export const HEBREW_WEEKDAY_NAMES = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת"
];

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatIsraeliDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function isTodayDate(dateStr: string): boolean {
  const today = new Date();
  return dateStr === formatDateToYYYYMMDD(today);
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Builds the weeks grid for a given year and month (0-indexed month)
 * Week starts on Sunday (day 0) and ends on Saturday (day 6).
 */
export function buildMonthWeeks(year: number, month: number, events: CalendarEvent[]): WeekData[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday
  const daysInMonth = lastDayOfMonth.getDate();

  const days: DayInfo[] = [];

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const date = new Date(year, month - 1, dayNum);
    const dateString = formatDateToYYYYMMDD(date);
    days.push({
      date,
      dateString,
      dayNumber: dayNum,
      dayOfWeek: date.getDay(),
      isCurrentMonth: false,
      isToday: isTodayDate(dateString),
      isWeekend: date.getDay() === 5 || date.getDay() === 6
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateString = formatDateToYYYYMMDD(date);
    days.push({
      date,
      dateString,
      dayNumber: d,
      dayOfWeek: date.getDay(),
      isCurrentMonth: true,
      isToday: isTodayDate(dateString),
      isWeekend: date.getDay() === 5 || date.getDay() === 6
    });
  }

  // Next month padding days to complete full weeks
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i);
    const dateString = formatDateToYYYYMMDD(date);
    days.push({
      date,
      dateString,
      dayNumber: i,
      dayOfWeek: date.getDay(),
      isCurrentMonth: false,
      isToday: isTodayDate(dateString),
      isWeekend: date.getDay() === 5 || date.getDay() === 6
    });
  }

  // Group into weeks of 7 days
  const weeks: WeekData[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const weekDays = days.slice(i, i + 7);
    const weekStartDateStr = weekDays[0].dateString;
    const weekEndDateStr = weekDays[6].dateString;

    // Determine segments for this week
    const segments: WeekGanttSegment[] = [];

    // Filter events overlapping with this week
    const activeEvents = events.filter(evt => {
      return evt.startDate <= weekEndDateStr && evt.endDate >= weekStartDateStr;
    });

    // Sort active events: longer multi-day events first, then by start date
    activeEvents.sort((a, b) => {
      const aDuration = parseDate(a.endDate).getTime() - parseDate(a.startDate).getTime();
      const bDuration = parseDate(b.endDate).getTime() - parseDate(b.startDate).getTime();
      if (bDuration !== aDuration) return bDuration - aDuration;
      return a.startDate.localeCompare(b.startDate);
    });

    // Track occupied slots for each day of the week (0 to 6)
    const slotOccupancy: boolean[][] = []; // slotOccupancy[slotIndex][dayIndex] = true/false

    for (const evt of activeEvents) {
      // Find start and end col in this week
      let startCol = 0;
      let endCol = 6;

      for (let col = 0; col < 7; col++) {
        if (weekDays[col].dateString === evt.startDate) {
          startCol = col;
          break;
        } else if (weekDays[col].dateString > evt.startDate) {
          // Started before this day (and since it's sorted, started before this week)
          startCol = 0;
          break;
        }
      }

      // If evt starts after week start, find exact startCol
      if (evt.startDate >= weekStartDateStr) {
        startCol = weekDays.findIndex(d => d.dateString === evt.startDate);
        if (startCol === -1) startCol = 0;
      } else {
        startCol = 0;
      }

      // If evt ends before week end, find exact endCol
      if (evt.endDate <= weekEndDateStr) {
        endCol = weekDays.findIndex(d => d.dateString === evt.endDate);
        if (endCol === -1) endCol = 6;
      } else {
        endCol = 6;
      }

      const isStartOfEvent = evt.startDate >= weekStartDateStr && evt.startDate <= weekEndDateStr;
      const isEndOfEvent = evt.endDate >= weekStartDateStr && evt.endDate <= weekEndDateStr;
      const continuesFromPrev = evt.startDate < weekStartDateStr;
      const continuesToNext = evt.endDate > weekEndDateStr;

      // Find first available slot where all cols from startCol to endCol are free
      let targetSlot = 0;
      while (true) {
        if (!slotOccupancy[targetSlot]) {
          slotOccupancy[targetSlot] = [false, false, false, false, false, false, false];
        }

        let isSlotFree = true;
        for (let col = startCol; col <= endCol; col++) {
          if (slotOccupancy[targetSlot][col]) {
            isSlotFree = false;
            break;
          }
        }

        if (isSlotFree) {
          // Occupy slot
          for (let col = startCol; col <= endCol; col++) {
            slotOccupancy[targetSlot][col] = true;
          }
          break;
        }
        targetSlot++;
      }

      segments.push({
        event: evt,
        startCol,
        endCol,
        isStartOfEvent,
        isEndOfEvent,
        continuesFromPrev,
        continuesToNext,
        slotIndex: targetSlot
      });
    }

    // Sort segments by slotIndex for consistent rendering order
    segments.sort((a, b) => a.slotIndex - b.slotIndex);

    weeks.push({
      days: weekDays,
      segments,
      maxSlots: slotOccupancy.length
    });
  }

  return weeks;
}
