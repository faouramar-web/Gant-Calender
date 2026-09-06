import React, { useState, useEffect } from "react";
import { X, Calendar, Check, AlertCircle, Trash2, Palette, FileText, User } from "lucide-react";
import { CalendarEvent, COLOR_OPTIONS } from "../types";
import { formatIsraeliDate } from "../utils/dateUtils";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onDeleteRequest?: () => void;
  initialEvent?: CalendarEvent | null;
  defaultDate?: string;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDeleteRequest,
  initialEvent,
  defaultDate,
}) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].hex);
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      setAuthor(initialEvent.author || "");
      setStartDate(initialEvent.startDate);
      setEndDate(initialEvent.endDate);
      setColor(initialEvent.color || COLOR_OPTIONS[0].hex);
      setNote(initialEvent.note || "");
    } else {
      const initDate = defaultDate || new Date().toISOString().split("T")[0];
      setTitle("");
      setAuthor("");
      setStartDate(initDate);
      setEndDate(initDate);
      setColor(COLOR_OPTIONS[0].hex);
      setNote("");
    }
    setError(null);
  }, [initialEvent, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!title.trim()) {
      setError("נא להזין את שם האירוע (שדה חובה)");
      return;
    }

    if (!startDate) {
      setError("נא לבחור תאריך התחלה (שדה חובה)");
      return;
    }

    if (!endDate) {
      setError("נא לבחור תאריך סיום (שדה חובה)");
      return;
    }

    if (endDate < startDate) {
      setError("תאריך הסיום אינו יכול להיות מוקדם מתאריך ההתחלה");
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        title: title.trim(),
        author: author.trim(),
        startDate,
        endDate,
        color,
        textColor: "#ffffff",
        note: note.trim(),
      });
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setError(err.message || "שגיאה בשמירת האירוע");
    }
  };

  const isEditing = Boolean(initialEvent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-full shadow-xs"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? "עריכת אירוע" : "הוספת אירוע חדש"}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title="סגירה"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-sm animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Event Title */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              שם האירוע <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: יום הורים, טיול שנתי, טקס יום הזיכרון"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-slate-900 text-sm font-medium transition-all"
            />
          </div>

          {/* Teacher / Author Field */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-sky-600" />
              <span>שם המורה / הרכז המזין (אופציונלי)</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="לדוגמה: מוחמד, ראניה, רכז שכבה י'"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-slate-900 text-sm font-medium transition-all"
            />
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>תאריך התחלה</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-slate-800 text-sm font-medium transition-all"
              />
              {startDate && (
                <span className="block text-[11px] text-slate-500 mt-1">
                  פורמט: {formatIsraeliDate(startDate)}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>תאריך סיום</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-slate-800 text-sm font-medium transition-all"
              />
              {endDate && (
                <span className="block text-[11px] text-slate-500 mt-1">
                  פורמט: {formatIsraeliDate(endDate)}
                </span>
              )}
            </div>
          </div>

          {/* Color Selection Palette */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-slate-600" />
              <span>בחירת צבע</span>
            </label>
            <div className="flex items-center flex-wrap gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              {COLOR_OPTIONS.map((opt) => {
                const isSelected = color === opt.hex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setColor(opt.hex)}
                    style={{ backgroundColor: opt.hex }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? "ring-3 ring-offset-2 ring-slate-800 scale-110"
                        : "hover:scale-105 opacity-85 hover:opacity-100"
                    }`}
                    title={opt.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Note Field */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>הערה (אופציונלי)</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="פרטים נוספים, מיקום, שעות, הנחיות מיוחדות..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-slate-900 text-sm font-normal resize-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {isEditing && onDeleteRequest ? (
              <button
                type="button"
                onClick={onDeleteRequest}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs sm:text-sm font-bold border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>מחיקת אירוע</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-full bg-[#0EA5E9] hover:bg-[#0284c7] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                {isSaving ? "שומר..." : "שמירה"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
