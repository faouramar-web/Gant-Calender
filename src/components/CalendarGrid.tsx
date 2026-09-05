import React from "react";
import { Plus, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { CalendarEvent, DayInfo, WeekData, WeekGanttSegment } from "../types";
import { HEBREW_WEEKDAY_NAMES, formatIsraeliDate } from "../utils/dateUtils";

interface CalendarGridProps {
  weeks: WeekData[];
  isEditMode: boolean;
  onSelectDay: (dateString: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  weeks,
  isEditMode,
  onSelectDay,
  onSelectEvent,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden calendar-print-wrapper">
      {/* Weekday Header Row (RTL: ראשון on right, שבת on left) */}
      <div className="grid grid-cols-7 border-b border-slate-300 bg-sky-700 text-white text-xs sm:text-sm font-bold divide-x divide-x-reverse divide-sky-600/50 shadow-xs">
        {HEBREW_WEEKDAY_NAMES.map((name, index) => {
          const isOffDay = index === 0 || index === 5; // Sunday (ראשון) & Friday (שישי) - ימים שלא מלמדים בהם
          return (
            <div
              key={name}
              className={`py-3 px-2 text-center select-none transition-colors ${
                isOffDay
                  ? "bg-[#4f46e5] text-white font-extrabold" // אינדיגו/סגול-כחול מואר וברור לימי שישי וראשון
                  : "bg-[#2563eb] text-white font-bold" // כחול מלכותי בהיר ונקי לשאר הימים
              }`}
            >
              <span className="text-white text-xs sm:text-sm font-bold tracking-wide drop-shadow-xs">
                {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Week Rows */}
      <div className="divide-y divide-slate-300">
        {weeks.map((week, weekIndex) => {
          // Calculate track height based on number of overlapping event slots with generous line spacing
          const minHeight = Math.max(136, 64 + week.maxSlots * 38);

          return (
            <div
              key={`week-${weekIndex}`}
              className="relative"
              style={{ minHeight: `${minHeight}px` }}
            >
              {/* Day Cells Grid (Background & Numbers) */}
              <div className="grid grid-cols-7 divide-x divide-x-reverse divide-slate-300 absolute inset-0">
                {week.days.map((day) => {
                  const isCurrent = day.isCurrentMonth;
                  const isToday = day.isToday;
                  const isWeekend = day.isWeekend;

                  return (
                    <div
                      key={day.dateString}
                      onClick={() => {
                        if (isEditMode) {
                          onSelectDay(day.dateString);
                        }
                      }}
                      className={`relative p-2.5 transition-all flex flex-col justify-between select-none ${
                        isToday
                          ? "bg-gradient-to-b from-sky-50/60 via-sky-50/25 to-transparent ring-2 ring-inset ring-sky-400/80 shadow-[inset_0_0_14px_rgba(14,165,233,0.12)] z-10"
                          : !isCurrent
                          ? "bg-slate-50/60 text-slate-300"
                          : "bg-white text-slate-800"
                      } ${isWeekend && !isToday ? (isCurrent ? "bg-slate-50/50" : "bg-slate-100/60") : ""} ${
                        isEditMode ? "hover:bg-sky-50/40 cursor-pointer group" : ""
                      }`}
                    >
                      {/* Day Number Header - Positioned firmly in the top-right corner (RTL) */}
                      <div className="flex items-start justify-between w-full">
                        <div className="flex items-center gap-1.5 self-start">
                          <div
                            className={`w-7 h-7 flex items-center justify-center text-xs sm:text-sm font-bold rounded-full transition-all ${
                              isToday
                                ? "bg-[#0EA5E9] text-white shadow-xs ring-2 ring-sky-200"
                                : isCurrent
                                ? "text-slate-800 hover:bg-slate-100 font-extrabold"
                                : "text-slate-400"
                            }`}
                          >
                            {day.dayNumber}
                          </div>

                          {isToday && (
                            <span className="inline-flex items-center text-[10px] font-bold text-sky-700 bg-sky-100/90 border border-sky-200/90 px-1.5 py-0.5 rounded-full shadow-2xs no-print">
                              היום
                            </span>
                          )}
                        </div>

                        {/* Plus icon on hover in edit mode (placed on the left side in RTL) */}
                        {isEditMode && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity no-print self-start">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 shadow-2xs">
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gantt Overlay Tracks (Rendered directly in RTL 7-column layout) */}
              <div className="relative pt-10 pb-3 px-1 space-y-2 pointer-events-none">
                {/* Group segments by slot index to ensure non-overlapping horizontal tracks */}
                {Array.from({ length: week.maxSlots }).map((_, slotIdx) => {
                  const slotSegments = week.segments.filter((s) => s.slotIndex === slotIdx);

                  return (
                    <div
                      key={`slot-${slotIdx}`}
                      className="grid grid-cols-7 h-8 gap-0 pointer-events-auto"
                    >
                      {slotSegments.map((segment) => {
                        const {
                          event,
                          startCol,
                          endCol,
                          isStartOfEvent,
                          isEndOfEvent,
                          continuesFromPrev,
                          continuesToNext,
                        } = segment;

                        const isSingleDay = event.startDate === event.endDate;

                        // Corner rounding styles for continuous ribbons in RTL:
                        // Start of event is on the RIGHT (rounded-r-full), End of event is on the LEFT (rounded-l-full)
                        const roundedClasses = isSingleDay
                          ? "rounded-full"
                          : `${isStartOfEvent ? "rounded-r-full" : "rounded-r-none border-r border-white/20"} ${
                              isEndOfEvent ? "rounded-l-full" : "rounded-l-none border-l border-white/20"
                            }`;

                        return (
                          <div
                            key={`${event.id}-${startCol}-${endCol}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent(event);
                            }}
                            style={{
                              gridColumnStart: startCol + 1,
                              gridColumnEnd: endCol + 2,
                              backgroundColor: event.color,
                              color: event.textColor || "#ffffff",
                            }}
                            className={`h-8 px-3 flex items-center justify-between shadow-2xs cursor-pointer relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-90 active:translate-y-0 active:scale-[0.99] hover:z-10 overflow-hidden ${roundedClasses}`}
                            title={`${event.title}${event.author ? ` | מורה מזין: ${event.author}` : ""} (${formatIsraeliDate(event.startDate)} - ${formatIsraeliDate(event.endDate)})${
                              event.note ? `\nהערה: ${event.note}` : ""
                            }`}
                          >
                            {/* Continuation Arrow on the Right (started previously in prior week) */}
                            {continuesFromPrev && (
                              <span className="flex items-center text-white/90 shrink-0 ml-1.5 text-xs">
                                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                              </span>
                            )}

                            {/* Event Title & Details */}
                            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                              {event.note && (
                                <FileText className="w-3.5 h-3.5 text-white/90 shrink-0" />
                              )}
                              <span className="truncate tracking-normal font-semibold text-sm sm:text-[14px] leading-tight">
                                {event.title}
                              </span>
                              {event.author && (
                                <span className="text-[12px] bg-black/20 px-1.5 py-0.5 rounded text-white/95 font-medium shrink-0">
                                  {event.author}
                                </span>
                              )}
                            </div>

                            {/* Continuation Arrow on the Left (continues into next week) */}
                            {continuesToNext && (
                              <span className="flex items-center text-white/90 shrink-0 mr-1.5 text-xs">
                                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
