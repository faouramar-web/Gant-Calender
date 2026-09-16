import React, { useMemo } from "react";
import { X, Calendar, CalendarDays, Sparkles, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft } from "lucide-react";
import { CalendarEvent } from "../types";
import { HEBREW_MONTH_NAMES } from "../utils/dateUtils";

interface YearlyOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  events: CalendarEvent[];
  onSelectMonth: (date: Date) => void;
}

export const YearlyOverviewModal: React.FC<YearlyOverviewModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  events,
  onSelectMonth,
}) => {
  if (!isOpen) return null;

  // Determine academic year (September to August) based on currentDate
  // If month is Sep-Dec (8-11), school year starts this year. If Jan-Aug (0-7), it started previous year.
  const currMonth = currentDate.getMonth();
  const currYear = currentDate.getFullYear();
  const startAcademicYear = currMonth >= 8 ? currYear : currYear - 1;
  const endAcademicYear = startAcademicYear + 1;

  // 12 months of the Israeli school year: September (8) to August (7)
  const academicMonths = useMemo(() => {
    const list: { monthIndex: number; year: number; monthName: string; isCurrentView: boolean; isCurrentToday: boolean }[] = [];
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // Sep to Dec of start year
    for (let m = 8; m <= 11; m++) {
      list.push({
        monthIndex: m,
        year: startAcademicYear,
        monthName: HEBREW_MONTH_NAMES[m],
        isCurrentView: currMonth === m && currYear === startAcademicYear,
        isCurrentToday: todayMonth === m && todayYear === startAcademicYear,
      });
    }

    // Jan to Aug of end year
    for (let m = 0; m <= 7; m++) {
      list.push({
        monthIndex: m,
        year: endAcademicYear,
        monthName: HEBREW_MONTH_NAMES[m],
        isCurrentView: currMonth === m && currYear === endAcademicYear,
        isCurrentToday: todayMonth === m && todayYear === endAcademicYear,
      });
    }

    return list;
  }, [startAcademicYear, endAcademicYear, currMonth, currYear]);

  // Group events by academic month
  const monthEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    academicMonths.forEach(({ monthIndex, year }) => {
      const key = `${year}-${monthIndex}`;
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const monthStartStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
      const monthEndStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const matchedEvents = events.filter((ev) => {
        return ev.startDate <= monthEndStr && ev.endDate >= monthStartStr;
      });

      // Sort by startDate
      matchedEvents.sort((a, b) => a.startDate.localeCompare(b.startDate));
      map.set(key, matchedEvents);
    });

    return map;
  }, [academicMonths, events]);

  const handleMonthClick = (year: number, monthIndex: number) => {
    onSelectMonth(new Date(year, monthIndex, 1));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  תצוגה שנתית – שנת הלימודים תשפ״ז
                </h3>
                <span className="text-xs font-bold text-sky-800 bg-sky-100/90 px-2.5 py-0.5 rounded-full border border-sky-200">
                  {startAcademicYear}–{endAcademicYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                לחץ על כל חודש כדי לעבור ישירות ללוח הגאנט המלא שלו
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title="סגירה"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 12 Months Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/60 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {academicMonths.map((item) => {
              const key = `${item.year}-${item.monthIndex}`;
              const monthEvents = monthEventsMap.get(key) || [];
              const displayLimit = 3;
              const remainingCount = monthEvents.length - displayLimit;

              return (
                <div
                  key={key}
                  onClick={() => handleMonthClick(item.year, item.monthIndex)}
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.98] ${
                    item.isCurrentView
                      ? "bg-white border-2 border-sky-500 ring-4 ring-sky-100/70 shadow-sky-500/10"
                      : "bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/20"
                  }`}
                >
                  {/* Card Top: Month name, Year, and Current Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
                          {item.monthName}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {item.year}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.isCurrentView && (
                          <span className="text-[11px] font-black bg-sky-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
                            נוכחי
                          </span>
                        )}
                        {item.isCurrentToday && !item.isCurrentView && (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                            החודש הזה
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            monthEvents.length > 0
                              ? "bg-slate-100 text-slate-700 font-extrabold"
                              : "bg-slate-50 text-slate-400"
                          }`}
                        >
                          {monthEvents.length} אירועים
                        </span>
                      </div>
                    </div>

                    {/* Events Preview Pills */}
                    <div className="space-y-1.5 min-h-[90px]">
                      {monthEvents.length === 0 ? (
                        <div className="h-full flex items-center justify-center py-4 text-xs text-slate-400 font-medium">
                          אין אירועים עדיין
                        </div>
                      ) : (
                        <>
                          {monthEvents.slice(0, displayLimit).map((ev) => (
                            <div
                              key={ev.id}
                              style={{
                                backgroundColor: ev.color,
                                color: ev.textColor || "#ffffff",
                              }}
                              className="px-2 py-1 rounded-md text-xs font-bold truncate shadow-2xs flex items-center justify-between"
                            >
                              <span className="truncate">{ev.title}</span>
                              <span className="text-[10px] opacity-85 shrink-0 mr-1.5">
                                {ev.startDate.split("-")[2]}
                                {ev.startDate !== ev.endDate ? `–${ev.endDate.split("-")[2]}` : ""}
                              </span>
                            </div>
                          ))}

                          {remainingCount > 0 && (
                            <div className="text-[11px] font-bold text-slate-500 text-center pt-0.5">
                              + עוד {remainingCount} פעילויות
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Navigation cue on hover */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-sky-600 transition-colors">
                    <span>פתח לוח חודשי</span>
                    <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/90 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>החודש הנוכחי המוצג בלוח מסומן בכחול</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-200/90 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            חזרה ללוח
          </button>
        </div>
      </div>
    </div>
  );
};
