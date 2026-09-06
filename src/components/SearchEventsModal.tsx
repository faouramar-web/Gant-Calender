import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  Calendar,
  ChevronLeft,
  CalendarDays,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  Edit2,
  Sparkles,
  User,
} from "lucide-react";
import { CalendarEvent } from "../types";
import { formatIsraeliDate, parseDate, HEBREW_MONTH_NAMES } from "../utils/dateUtils";

interface SearchEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onNavigateToDate: (date: Date) => void;
  isEditMode: boolean;
  onEditEvent?: (event: CalendarEvent) => void;
}

export const SearchEventsModal: React.FC<SearchEventsModalProps> = ({
  isOpen,
  onClose,
  events,
  onSelectEvent,
  onNavigateToDate,
  isEditMode,
  onEditEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "multiday" | "single">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
      setFilterType("all");
    }
  }, [isOpen]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return events
      .filter((event) => {
        // Multi-day duration check
        const start = parseDate(event.startDate);
        const end = parseDate(event.endDate);
        const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const isMulti = duration > 1;

        if (filterType === "multiday" && !isMulti) return false;
        if (filterType === "single" && isMulti) return false;

        if (!q) return true;

        const titleMatch = event.title.toLowerCase().includes(q);
        const noteMatch = (event.note || "").toLowerCase().includes(q);
        const authorMatch = (event.author || "").toLowerCase().includes(q);
        const dateMatch =
          event.startDate.includes(q) ||
          event.endDate.includes(q) ||
          formatIsraeliDate(event.startDate).includes(q) ||
          formatIsraeliDate(event.endDate).includes(q);

        // Also check month name match (e.g., "ספטמבר", "אוקטובר")
        const startMonthName = HEBREW_MONTH_NAMES[start.getMonth()] || "";
        const endMonthName = HEBREW_MONTH_NAMES[end.getMonth()] || "";
        const monthMatch =
          startMonthName.toLowerCase().includes(q) || endMonthName.toLowerCase().includes(q);

        return titleMatch || noteMatch || authorMatch || dateMatch || monthMatch;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [events, searchQuery, filterType]);

  if (!isOpen) return null;

  const handleJumpToMonth = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetDate = parseDate(event.startDate);
    onNavigateToDate(targetDate);
    onClose();
  };

  const handleEventClick = (event: CalendarEvent) => {
    onSelectEvent(event);
    onClose();
  };

  const handleEditClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditEvent) {
      onEditEvent(event);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header & Search Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Search className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                חיפוש אירועים בלוח גאנט
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              title="סגירה"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Box */}
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש לפי שם אירוע, הערה, חודש או תאריך (לדוגמה: יום הורים, טיול, ספטמבר...)"
              className="w-full bg-white border-2 border-blue-400 focus:border-blue-600 rounded-2xl py-2.5 pr-10 pl-10 text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-inner focus:outline-none transition-all"
            />
            <Search className="w-4 h-4 text-blue-600 absolute right-3.5 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 absolute left-3 cursor-pointer"
                title="נקה חיפוש"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tags & Results Counter */}
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium ml-1">סינון:</span>
              <button
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  filterType === "all"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                הכל ({events.length})
              </button>
              <button
                onClick={() => setFilterType("multiday")}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  filterType === "multiday"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                רב-יומי בלבד
              </button>
              <button
                onClick={() => setFilterType("single")}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  filterType === "single"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                חד-יומי בלבד
              </button>
            </div>

            <div className="text-slate-500 font-semibold">
              נמצאו <span className="text-blue-700 font-bold">{filteredEvents.length}</span> אירועים
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-4 space-y-2.5 flex-1 divide-y-0">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">
                לא נמצאו אירועים תואמים
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `לא נמצאו תוצאות עבור החיפוש "${searchQuery}". נסה לחפש מילת מפתח אחרת או לנקות את שדה החיפוש.`
                  : "עדיין לא נוספו אירועים ללוח הגאנט."}
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const startDateObj = parseDate(event.startDate);
              const endDateObj = parseDate(event.endDate);
              const durationDays =
                Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const isMulti = durationDays > 1;
              const startMonthName = HEBREW_MONTH_NAMES[startDateObj.getMonth()];

              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="group relative bg-white hover:bg-blue-50/40 p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  {/* Left Color Accent Bar */}
                  <div
                    className="absolute top-2 bottom-2 right-2 w-1.5 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />

                  {/* Main Event Information */}
                  <div className="pr-4 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: event.color }}
                      />
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {event.title}
                      </h4>
                      {isMulti ? (
                        <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                          רב-יומי ({durationDays} ימים)
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          יומי
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap mt-1">
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        {formatIsraeliDate(event.startDate)}
                        {isMulti && ` עד ${formatIsraeliDate(event.endDate)}`}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        חודש {startMonthName} {startDateObj.getFullYear()}
                      </span>
                    </div>

                    {event.note && (
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{event.note}</span>
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pr-4 sm:pr-0">
                    <button
                      type="button"
                      onClick={(e) => handleJumpToMonth(event, e)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="עבור לחודש שבו מתקיים האירוע"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>מעבר לחודש</span>
                    </button>

                    {isEditMode && onEditEvent && (
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(event, e)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                        title="עריכת האירוע"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>עריכה</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>לחיצה על אירוע פותחת את כרטיס המידע המלא</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
