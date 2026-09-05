import React, { useRef } from "react";
import { GraduationCap, Lock, Unlock, Plus, Printer, Eye, CheckCircle2, School, Download, Upload, Search, Cloud } from "lucide-react";

interface HeaderProps {
  isEditMode: boolean;
  onOpenPasswordModal: () => void;
  onExitEditMode: () => void;
  onOpenAddEventModal: () => void;
  onOpenA3ExportModal: () => void;
  onOpenSearchModal: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isEditMode,
  onOpenPasswordModal,
  onExitEditMode,
  onOpenAddEventModal,
  onOpenA3ExportModal,
  onOpenSearchModal,
  onExportBackup,
  onImportBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30 no-print">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* School Brand & Title */}
          <div className="flex items-center gap-3.5 text-right w-full md:w-auto justify-between md:justify-start">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-normal">
                  לוח גאנט – חטיבת הביניים ב׳ אבו סנאן
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-full">
                  <School className="w-3.5 h-3.5 text-sky-600" />
                  סמל מוסד: 640615
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">שנת הלימודים תשפ״ז</span>
                <span className="text-xs text-slate-300 hidden sm:inline">•</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full" title="הנתונים מסונכרנים בזמן אמת לכל המורים דרך Google Firebase">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  סנכרון ענן בזמן אמת
                </span>
              </div>
            </div>
          </div>

          {/* Actions & Permissions Controls */}
          <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
            {/* Status indicator */}
            {isEditMode ? (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>מצב עריכה פעיל</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-50/50 border border-blue-500 text-blue-900 text-xs sm:text-sm font-semibold shadow-2xs">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>מצב צפייה בלבד</span>
              </div>
            )}

            {/* Search Events Button - Styled consistently with blue border */}
            <button
              onClick={onOpenSearchModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-sky-50 text-blue-900 border border-blue-500 text-xs sm:text-sm font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="חיפוש אירועים בלוח גאנט"
            >
              <Search className="w-4 h-4 text-blue-600" />
              <span>חיפוש אירועים</span>
            </button>

            {/* Backup Export & Import Buttons (Visible ONLY in Edit Mode) */}
            {isEditMode && (
              <>
                <button
                  onClick={onExportBackup}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-sky-50 text-sky-800 border border-blue-500 text-xs sm:text-sm font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="הורדת קובץ גיבוי JSON עם כל האירועים"
                >
                  <Download className="w-4 h-4 text-sky-600" />
                  <span>גיבוי JSON</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-blue-500 text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="שחזור אירועים מקובץ גיבוי JSON"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>שחזור מגיבוי</span>
                </button>
              </>
            )}

            {/* A3 Print / Export Button */}
            <button
              onClick={onOpenA3ExportModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-sky-50 text-blue-900 border border-blue-500 text-xs sm:text-sm font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="שמירת החודש ב-PDF והדפסה A3 לרוחב"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>שמירה והדפסה A3</span>
            </button>

            {/* Add event button (only when edit mode is active) */}
            {isEditMode && (
              <button
                onClick={onOpenAddEventModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0EA5E9] hover:bg-[#0284c7] text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>הוספת אירוע</span>
              </button>
            )}

            {/* Mode switch button */}
            {isEditMode ? (
              <button
                onClick={onExitEditMode}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-blue-500 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <Unlock className="w-4 h-4 text-slate-600" />
                <span>יציאה ממצב עריכה</span>
              </button>
            ) : (
              <button
                onClick={onOpenPasswordModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-blue-500 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <span>כניסה למצב עריכה</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
