import React from "react";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { HEBREW_MONTH_NAMES } from "../utils/dateUtils";

interface MonthNavigationProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  totalEventsInMonth: number;
}

export const MonthNavigation: React.FC<MonthNavigationProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  totalEventsInMonth,
}) => {
  const monthName = HEBREW_MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 no-print">
      {/* Month & Year Display with Navigation Arrows */}
      <div className="flex items-center gap-3">
        {/* In RTL: Right chevron goes backward (previous month), Left chevron goes forward (next month) */}
        <button
          onClick={onPrevMonth}
          className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all active:scale-95 cursor-pointer shadow-2xs font-bold"
          title="החודש הקודם"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="text-center min-w-[200px]">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-normal flex items-center justify-center gap-2.5">
            <span>{monthName}</span>
            <span className="text-[#0EA5E9] font-bold">{year}</span>
          </h2>
        </div>

        <button
          onClick={onNextMonth}
          className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all active:scale-95 cursor-pointer shadow-2xs font-bold"
          title="החודש הבא"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Right side helper info & Today button */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-700 text-xs sm:text-sm font-bold shadow-2xs">
          <Sparkles className="w-4 h-4 text-[#0EA5E9]" />
          <span>{totalEventsInMonth} אירועים ופעילויות בחודש</span>
        </div>

        <button
          onClick={onToday}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-sky-50 text-[#0EA5E9] hover:text-[#0284c7] text-sm font-black border border-slate-200 hover:border-sky-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <CalendarIcon className="w-4 h-4 text-[#0EA5E9]" />
          <span>היום</span>
        </button>
      </div>
    </div>
  );
};
