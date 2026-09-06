import React from "react";
import { X, Calendar, FileText, Lock, Clock, User } from "lucide-react";
import { CalendarEvent } from "../types";
import { formatIsraeliDate, parseDate } from "../utils/dateUtils";

interface ViewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onSwitchToEditMode?: () => void;
}

export const ViewEventModal: React.FC<ViewEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onSwitchToEditMode,
}) => {
  if (!isOpen || !event) return null;

  const startDateObj = parseDate(event.startDate);
  const endDateObj = parseDate(event.endDate);
  const durationDays =
    Math.round(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  const isMultiDay = durationDays > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Top color banner */}
        <div
          className="h-4 w-full"
          style={{ backgroundColor: event.color }}
        />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div className="flex-1 pr-1">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white mb-2"
              style={{ backgroundColor: event.color }}
            >
              {isMultiDay ? `אירוע רב-יומי (${durationDays} ימים)` : "אירוע יומי"}
            </span>
            <h3 className="text-xl font-bold text-slate-900 leading-snug">
              {event.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0"
            title="סגירה"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Event Details Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Dates Display */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                תאריך התחלה:
              </span>
              <span className="font-bold text-slate-800">
                {formatIsraeliDate(event.startDate)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                תאריך סיום:
              </span>
              <span className="font-bold text-slate-800">
                {formatIsraeliDate(event.endDate)}
              </span>
            </div>

            {isMultiDay && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  משך האירוע:
                </span>
                <span className="font-bold text-slate-800">
                  {durationDays} ימים ברציפות
                </span>
              </div>
            )}
          </div>

          {/* Note (if exists) */}
          {event.note ? (
            <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/80">
              <div className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>הערות ופרטים:</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {event.note}
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic text-center py-1">
              אין הערות נוספות עבור אירוע זה
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {onSwitchToEditMode ? (
            <button
              onClick={onSwitchToEditMode}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>מעבר לעריכה בסיסמה</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
