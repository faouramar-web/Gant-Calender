import React, { useState, useEffect } from "react";
import { Trash2, X, AlertTriangle, KeyRound, AlertCircle } from "lucide-react";
import { CalendarEvent } from "../types";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onConfirmDelete: (password: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  event,
  onConfirmDelete,
}) => {
  const [password, setPassword] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setIsPasswordVerified(false);
      setError(null);
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "160525") {
      setIsPasswordVerified(true);
      setError(null);
    } else {
      setError("הסיסמה שגויה");
      setPassword("");
    }
  };

  const handleFinalDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete("160525");
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setError(err.message || "שגיאה במחיקת האירוע");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-rose-900">
              מחיקת אירוע
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title="סגירה"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isPasswordVerified ? (
            /* Step 1: Request Password before deletion */
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                לפני מחיקת האירוע <strong className="text-slate-900">"{event.title}"</strong>, נא להזין את סיסמת העריכה:
              </p>

              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הקלד סיסמה..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none text-slate-900 text-center text-lg tracking-widest font-mono font-bold transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                >
                  אימות סיסמה
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Final Confirmation */
            <div className="space-y-4 text-center animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  האם למחוק את האירוע לצמיתות?
                </h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  "{event.title}" יימחק לצמיתות מהלוח.
                </p>
              </div>

              <div className="pt-3 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleFinalDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                >
                  {isDeleting ? "מוחק..." : "מחיקה"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
