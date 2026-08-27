import React, { useState } from "react";
import { X, Download, Printer, CheckCircle, FileDown, Loader2, Sparkles } from "lucide-react";
import { CalendarEvent, WeekData } from "../types";
import { HEBREW_MONTH_NAMES, HEBREW_WEEKDAY_NAMES, formatIsraeliDate } from "../utils/dateUtils";

interface A3ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  weeks: WeekData[];
  events: CalendarEvent[];
}

export const A3ExportModal: React.FC<A3ExportModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  weeks,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const monthName = HEBREW_MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const pdfFileName = `לוח גאנט – ${monthName} ${year}.pdf`;

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setDownloadSuccess(false);

      const printableElement = document.getElementById("a3-printable-document");
      if (!printableElement) {
        throw new Error("רכיב ההדפסה לא נמצא");
      }

      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      // Render the DOM to canvas with high resolution scale
      const canvas = await html2canvas(printableElement, {
        scale: 2, // High DPI for crystal clear text and colors on A3 print
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      // A3 Landscape dimensions in mm: 420 × 297
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      const pdfWidth = 420;
      const pdfHeight = 297;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(pdfFileName);

      setIsGeneratingPdf(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error("PDF generation error:", err);
      setIsGeneratingPdf(false);
      alert("חלה שגיאה ביצירת קובץ ה-PDF. ניתן להשתמש בכפתור פתיחת חלון הדפסה.");
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                שמירה והדפסה A3 לרוחב
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {monthName} {year} • חטיבת הביניים ב׳ אבו סנאן
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNativePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs"
              title="פתיחת חלון ההדפסה של המחשב"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>הדפסה במדפסת</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0EA5E9] hover:bg-[#0284c7] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>מפיק PDF בגודל A3...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>הורדת קובץ PDF (A3)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer mr-2"
              title="סגירה"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in slide-in-from-top-1">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>קובץ ה-PDF בגודל A3 לרוחב הורד בהצלחה! שם הקובץ: "{pdfFileName}"</span>
          </div>
        )}

        {/* Preview Area */}
        <div className="p-6 overflow-y-auto bg-slate-100/60 flex flex-col items-center">
          <div className="w-full text-xs text-slate-500 mb-3 flex items-center justify-between">
            <span>תצוגה מקדימה של דף ה-A3 (לרוחב, מוכן להדפסה ללא כפתורי עריכה):</span>
            <span className="font-semibold text-indigo-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              פורמט 420mm × 297mm
            </span>
          </div>

          {/* Printable Layout Target Container for HTML2Canvas */}
          <div
            id="a3-printable-document"
            className="w-full bg-white rounded-xl shadow-lg border border-slate-300 p-8 text-slate-900"
            style={{
              minWidth: "900px",
              aspectRatio: "420 / 297",
            }}
          >
            {/* Header for print/PDF */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-normal">
                  לוח גאנט – חטיבת הביניים ב׳ אבו סנאן
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                    סמל מוסד: 640615
                  </span>
                  <span className="text-xs text-slate-500 font-medium">שנת הלימודים תשפ״ז</span>
                </div>
              </div>

              <div className="text-left">
                <div className="text-3xl font-bold text-blue-800">
                  {monthName} {year}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  לוח תכנון ופעילות חודשי
                </div>
              </div>
            </div>

            {/* Print Grid */}
            <div className="border-2 border-slate-800 rounded-lg overflow-hidden">
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b-2 border-sky-800 bg-sky-700 text-white font-bold text-sm divide-x divide-x-reverse divide-sky-600/60">
                {HEBREW_WEEKDAY_NAMES.map((name, i) => {
                  const isOffDay = i === 0 || i === 5; // Sunday & Friday
                  return (
                    <div
                      key={name}
                      className={`py-2.5 text-center text-white font-bold tracking-wide ${
                        isOffDay ? "bg-[#4f46e5]" : "bg-[#2563eb]"
                      }`}
                    >
                      {name}
                    </div>
                  );
                })}
              </div>

              {/* Weeks */}
              <div className="divide-y divide-slate-300">
                {weeks.map((week, weekIdx) => {
                  const minH = Math.max(90, 45 + week.maxSlots * 26);
                  return (
                    <div
                      key={`print-week-${weekIdx}`}
                      className="relative"
                      style={{ minHeight: `${minH}px` }}
                    >
                      {/* Day cells */}
                      <div className="grid grid-cols-7 divide-x divide-x-reverse divide-slate-300 absolute inset-0">
                        {week.days.map((day) => (
                          <div
                            key={`print-${day.dateString}`}
                            className={`p-1.5 flex flex-col justify-between ${
                              !day.isCurrentMonth
                                ? "bg-slate-100/70 text-slate-400"
                                : day.isWeekend
                                ? "bg-slate-50"
                                : "bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-start w-full">
                              <span
                                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                  day.isToday
                                    ? "bg-blue-700 text-white"
                                    : day.isCurrentMonth
                                    ? "text-slate-900 font-extrabold"
                                    : "text-slate-400"
                                }`}
                              >
                                {day.dayNumber}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Continuous Gantt Ribbon Segments for Print */}
                      <div className="relative pt-7 pb-1.5 px-0.5 space-y-1.5">
                        {Array.from({ length: week.maxSlots }).map((_, sIdx) => {
                          const segs = week.segments.filter(
                            (s) => s.slotIndex === sIdx
                          );
                          return (
                            <div
                              key={`print-slot-${sIdx}`}
                              className="grid grid-cols-7 h-7 gap-0"
                            >
                              {segs.map((seg) => {
                                const isSingle =
                                  seg.event.startDate === seg.event.endDate;
                                const roundedStyle = isSingle
                                  ? "rounded-md"
                                  : `${
                                      seg.isStartOfEvent
                                        ? "rounded-r-md"
                                        : "rounded-r-none"
                                    } ${
                                      seg.isEndOfEvent
                                        ? "rounded-l-md"
                                        : "rounded-l-none"
                                    }`;

                                return (
                                  <div
                                    key={`print-${seg.event.id}-${seg.startCol}`}
                                    style={{
                                      gridColumnStart: seg.startCol + 1,
                                      gridColumnEnd: seg.endCol + 2,
                                      backgroundColor: seg.event.color,
                                      color: seg.event.textColor || "#ffffff",
                                    }}
                                    className={`h-7 px-2 flex items-center justify-between text-xs shadow-2xs overflow-hidden ${roundedStyle}`}
                                  >
                                    <span className="truncate text-[12.5px] font-semibold">
                                      {seg.event.title}
                                    </span>
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

            {/* Print Footer */}
            <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>חטיבת הביניים ב׳ אבו סנאן • משרד החינוך • מחוז צפון</span>
              <span className="text-center font-semibold text-slate-600">
                כל הזכויות שמורות לעמאר פאעור © {new Date().getFullYear()} • Amar Faour
              </span>
              <span>הופק בתאריך: {formatIsraeliDate(new Date().toISOString().split("T")[0])}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
