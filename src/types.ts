export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  color: string;     // Hex color
  textColor?: string;
  note?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  textColor: string;
  borderHex: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { id: "sky", name: "תכלת זוהר", hex: "#0ea5e9", textColor: "#ffffff", borderHex: "#0284c7" },
  { id: "blue", name: "כחול מלכותי", hex: "#3b82f6", textColor: "#ffffff", borderHex: "#2563eb" },
  { id: "emerald", name: "ירוק אמרלד", hex: "#10b981", textColor: "#ffffff", borderHex: "#059669" },
  { id: "orange", name: "כתום שקיעה", hex: "#f97316", textColor: "#ffffff", borderHex: "#ea580c" },
  { id: "purple", name: "סגול חי", hex: "#a855f7", textColor: "#ffffff", borderHex: "#9333ea" },
  { id: "rose", name: "אדום קורל", hex: "#f43f5e", textColor: "#ffffff", borderHex: "#e11d48" },
  { id: "amber", name: "ענבר מוזהב", hex: "#f59e0b", textColor: "#ffffff", borderHex: "#d97706" },
  { id: "indigo", name: "אינדיגו עמוק", hex: "#6366f1", textColor: "#ffffff", borderHex: "#4f46e5" },
  { id: "cyan", name: "טורקיז", hex: "#06b6d4", textColor: "#ffffff", borderHex: "#0891b2" },
  { id: "slate", name: "אפור גרפיט", hex: "#64748b", textColor: "#ffffff", borderHex: "#475569" },
];

export interface DayInfo {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: number; // 0 = Sunday (ראשון), 6 = Saturday (שבת)
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean; // Friday & Saturday
}

export interface WeekGanttSegment {
  event: CalendarEvent;
  startCol: number; // 0 (Sunday) to 6 (Saturday)
  endCol: number;   // 0 to 6
  isStartOfEvent: boolean;
  isEndOfEvent: boolean;
  continuesFromPrev: boolean;
  continuesToNext: boolean;
  slotIndex: number;
}

export interface WeekData {
  days: DayInfo[];
  segments: WeekGanttSegment[];
  maxSlots: number;
}
